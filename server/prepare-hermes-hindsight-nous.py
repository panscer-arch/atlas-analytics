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
ENV_FILE = HERMES_HOME / ".env"
CONFIG_FILE = HERMES_HOME / "hindsight" / "config.json"
HERMES_CONFIG_FILE = HERMES_HOME / "config.yaml"
PROFILE_ENV_FILE = HERMES_HOME / ".hindsight" / "profiles" / "hermes.env"
EMBED_BIN = HERMES_AGENT / "venv" / "bin" / "hindsight-embed"
CANONICAL_AUTH_FILE = HERMES_HOME / "auth.json"
HINDSIGHT_AUTH_FILE = HERMES_HOME / ".hermes" / "auth.json"


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


def read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


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

    CANONICAL_AUTH_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary = CANONICAL_AUTH_FILE.with_suffix(".tmp")
    temporary.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.chmod(0o600)
    temporary.replace(CANONICAL_AUTH_FILE)

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


def main():
    sys.path.insert(0, str(HERMES_AGENT))
    from hermes_cli.auth import resolve_nous_runtime_credentials

    credentials = resolve_nous_runtime_credentials(timeout_seconds=30)
    api_key = str(credentials.get("api_key") or "")
    base_url = str(credentials.get("base_url") or "").rstrip("/")
    if not api_key or not base_url:
        raise RuntimeError("Nous did not return inference credentials")
    merge_auth_stores()

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
        "llm_provider": "nous",
        "llm_base_url": base_url,
        "llm_model": configured_model(),
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
        "HINDSIGHT_API_LLM_PROVIDER": "nous",
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

    print(json.dumps({
        "ok": True,
        "provider": "nous",
        "host": urlparse(base_url).hostname,
        "model": config["llm_model"],
        "expiresAt": credentials.get("expires_at"),
        "credentialUpdated": previous != api_key,
        "profileUpdated": profile_changed,
    }))


if __name__ == "__main__":
    main()
