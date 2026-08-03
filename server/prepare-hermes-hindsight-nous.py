#!/usr/bin/env python3
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse


HERMES_HOME = Path(os.environ.get("HERMES_HOME", "/opt/hermes"))
HERMES_AGENT = Path(os.environ.get(
    "HERMES_AGENT_ROOT",
    HERMES_HOME / ".hermes" / "hermes-agent",
))
HERMES_BIN = Path(os.environ.get("HERMES_BIN", HERMES_HOME / ".local" / "bin" / "hermes"))
ENV_FILE = HERMES_HOME / ".env"
CONFIG_FILE = HERMES_HOME / "hindsight" / "config.json"
HERMES_CONFIG_FILE = HERMES_HOME / "config.yaml"
PROFILE_ENV_FILE = HERMES_HOME / ".hindsight" / "profiles" / "hermes.env"
EMBED_BIN = HERMES_AGENT / "venv" / "bin" / "hindsight-embed"
CANONICAL_AUTH_FILE = HERMES_HOME / "auth.json"
HINDSIGHT_AUTH_FILE = HERMES_HOME / ".hermes" / "auth.json"
SHARED_NOUS_AUTH_FILE = Path(os.environ.get(
    "HERMES_SHARED_AUTH_DIR",
    HERMES_HOME / ".hermes" / "shared",
)) / "nous_auth.json"


def replace_env_value(path, key, value):
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    replacement = f"{key}={value}"
    updated = []
    replaced = False
    for line in lines:
        if line.startswith(f"{key}="):
            if not replaced:
                updated.append(replacement)
                replaced = True
        else:
            updated.append(line)
    if not replaced:
        updated.append(replacement)
    temporary = path.with_suffix(".tmp")
    temporary.write_text("\n".join(updated) + "\n", encoding="utf-8")
    temporary.chmod(0o600)
    temporary.replace(path)


def read_env_value(path, key):
    if not path.exists():
        return ""
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip()
    return ""


def configured_model():
    explicit = os.environ.get("HINDSIGHT_NOUS_MODEL", "").strip()
    if explicit:
        return explicit
    try:
        import yaml
        config = yaml.safe_load(HERMES_CONFIG_FILE.read_text(encoding="utf-8")) or {}
        model = str((config.get("model") or {}).get("default") or "").strip()
        if model:
            return model
    except Exception:
        pass
    return "Hermes-4-70B"


def resolve_memory_credentials(resolve_nous):
    try:
        credentials = resolve_nous(timeout_seconds=30)
        return {
            **credentials,
            "provider": "nous",
            "model": configured_model(),
            "fallback": False,
        }
    except Exception as nous_error:
        api_key = os.environ.get("OPENAI_API_KEY", "").strip() or read_env_value(ENV_FILE, "OPENAI_API_KEY")
        if not api_key:
            raise nous_error
        return {
            "api_key": api_key,
            "base_url": os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/"),
            "provider": "openai",
            "model": os.environ.get("HINDSIGHT_OPENAI_MODEL", "gpt-4o-mini"),
            "fallback": True,
            "fallback_reason": type(nous_error).__name__,
        }


def read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def write_private_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.chmod(0o600)
    temporary.replace(path)


def merge_auth_stores():
    """Give Hermes and Hindsight one OAuth store so token rotation stays atomic."""
    canonical = read_json(CANONICAL_AUTH_FILE)
    secondary = read_json(HINDSIGHT_AUTH_FILE)
    merged = dict(secondary)
    merged.update({key: value for key, value in canonical.items()
                   if key not in {"providers", "credential_pool"}})
    merged["providers"] = {
        **(secondary.get("providers") or {}),
        **(canonical.get("providers") or {}),
    }
    merged["credential_pool"] = {
        **(secondary.get("credential_pool") or {}),
        **(canonical.get("credential_pool") or {}),
    }

    write_private_json(CANONICAL_AUTH_FILE, merged)

    HINDSIGHT_AUTH_FILE.parent.mkdir(parents=True, exist_ok=True)
    if HINDSIGHT_AUTH_FILE.is_symlink():
        if HINDSIGHT_AUTH_FILE.resolve() == CANONICAL_AUTH_FILE.resolve():
            return
        HINDSIGHT_AUTH_FILE.unlink()
    elif HINDSIGHT_AUTH_FILE.exists():
        backup = HINDSIGHT_AUTH_FILE.with_suffix(".pre-nous.json")
        if not backup.exists():
            shutil.copy2(HINDSIGHT_AUTH_FILE, backup)
            backup.chmod(0o600)
        HINDSIGHT_AUTH_FILE.unlink()
    HINDSIGHT_AUTH_FILE.symlink_to(CANONICAL_AUTH_FILE)


def restore_nous_provider_from_shared_store():
    """Repair an incomplete providers.nous entry from Hermes' shared OAuth store."""
    auth_store = read_json(CANONICAL_AUTH_FILE)
    providers = auth_store.setdefault("providers", {})
    if not isinstance(providers, dict):
        providers = {}
        auth_store["providers"] = providers
    current = providers.get("nous")
    current = dict(current) if isinstance(current, dict) else {}
    if current.get("access_token") and current.get("refresh_token"):
        return False

    shared = read_json(SHARED_NOUS_AUTH_FILE)
    if not shared.get("access_token") or not shared.get("refresh_token"):
        return False

    for key in (
        "access_token",
        "refresh_token",
        "token_type",
        "scope",
        "client_id",
        "portal_base_url",
        "inference_base_url",
        "obtained_at",
        "expires_at",
    ):
        value = shared.get(key)
        if value not in {None, ""}:
            current[key] = value
    current.pop("last_auth_error", None)
    providers["nous"] = current
    auth_store["active_provider"] = "nous"
    write_private_json(CANONICAL_AUTH_FILE, auth_store)
    return True


def main():
    sys.path.insert(0, str(HERMES_AGENT))
    from hermes_cli.auth import resolve_nous_runtime_credentials

    merge_auth_stores()
    restored_from_shared = restore_nous_provider_from_shared_store()
    credentials = resolve_memory_credentials(resolve_nous_runtime_credentials)
    api_key = str(credentials.get("api_key") or "")
    base_url = str(credentials.get("base_url") or "").rstrip("/")
    provider = str(credentials.get("provider") or "nous")
    model = str(credentials.get("model") or configured_model())
    if not api_key or not base_url:
        raise RuntimeError("No inference credentials are available for Hindsight")

    previous = ""
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            if line.startswith("HINDSIGHT_LLM_API_KEY="):
                previous = line.split("=", 1)[1]
                break
    replace_env_value(ENV_FILE, "HINDSIGHT_LLM_API_KEY", api_key)

    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    try:
        config = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        config = {}
    config.update({
        "mode": "local_embedded",
        "llm_provider": provider,
        "llm_base_url": base_url,
        "llm_model": model,
    })
    temporary = CONFIG_FILE.with_suffix(".tmp")
    temporary.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.chmod(0o600)
    temporary.replace(CONFIG_FILE)

    profile_previous = {}
    if PROFILE_ENV_FILE.exists():
        for line in PROFILE_ENV_FILE.read_text(encoding="utf-8").splitlines():
            if "=" in line:
                key, value = line.split("=", 1)
                profile_previous[key] = value
    PROFILE_ENV_FILE.parent.mkdir(parents=True, exist_ok=True)
    profile_values = {
        "HINDSIGHT_API_LLM_PROVIDER": provider,
        "HINDSIGHT_API_LLM_API_KEY": api_key,
        "HINDSIGHT_API_LLM_MODEL": config["llm_model"],
        "HINDSIGHT_API_LLM_BASE_URL": base_url,
        "HINDSIGHT_API_LOG_LEVEL": profile_previous.get("HINDSIGHT_API_LOG_LEVEL", "INFO"),
        "HINDSIGHT_EMBED_DAEMON_IDLE_TIMEOUT": profile_previous.get("HINDSIGHT_EMBED_DAEMON_IDLE_TIMEOUT", "300"),
    }
    for key, value in profile_values.items():
        replace_env_value(PROFILE_ENV_FILE, key, value)

    profile_changed = any(profile_previous.get(key) != value for key, value in profile_values.items())
    if profile_changed and EMBED_BIN.exists():
        subprocess.run(
            [str(EMBED_BIN), "-p", "hermes", "daemon", "stop"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )

    if credentials.get("fallback") and HERMES_BIN.exists():
        subprocess.run([str(HERMES_BIN), "config", "set", "model.provider", "custom"], check=True)
        subprocess.run([str(HERMES_BIN), "config", "set", "model.default", model], check=True)
        subprocess.run([str(HERMES_BIN), "config", "set", "model.base_url", base_url], check=True)

    print(json.dumps({
        "ok": True,
        "provider": provider,
        "host": urlparse(base_url).hostname,
        "model": model,
        "expiresAt": credentials.get("expires_at"),
        "restoredFromShared": restored_from_shared,
        "usedFallback": bool(credentials.get("fallback")),
        "fallbackReason": credentials.get("fallback_reason"),
        "credentialUpdated": previous != api_key,
        "profileUpdated": profile_changed,
    }))


if __name__ == "__main__":
    main()
