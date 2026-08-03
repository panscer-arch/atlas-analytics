#!/usr/bin/env python3
import importlib.util
import json
import tempfile
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "server" / "prepare-hermes-hindsight-nous.py"
SPEC = importlib.util.spec_from_file_location("prepare_hermes_hindsight_nous", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

with tempfile.TemporaryDirectory(prefix="atlas-nous-auth-") as directory:
    root = Path(directory)
    MODULE.CANONICAL_AUTH_FILE = root / "auth.json"
    MODULE.HINDSIGHT_AUTH_FILE = root / ".hermes" / "auth.json"
    MODULE.SHARED_NOUS_AUTH_FILE = root / ".hermes" / "shared" / "nous_auth.json"

    MODULE.write_private_json(MODULE.CANONICAL_AUTH_FILE, {
        "version": 1,
        "providers": {"nous": {"refresh_token": "same-refresh"}},
        "credential_pool": {"nous": [{"access_token": "pool-access"}]},
    })
    MODULE.write_private_json(MODULE.SHARED_NOUS_AUTH_FILE, {
        "_schema": 1,
        "access_token": "shared-access",
        "refresh_token": "same-refresh",
        "scope": "inference:invoke",
        "expires_at": "2026-08-04T00:00:00+00:00",
    })

    MODULE.merge_auth_stores()
    assert MODULE.restore_nous_provider_from_shared_store() is True
    repaired = json.loads(MODULE.CANONICAL_AUTH_FILE.read_text(encoding="utf-8"))
    assert repaired["providers"]["nous"]["access_token"] == "shared-access"
    assert repaired["providers"]["nous"]["refresh_token"] == "same-refresh"
    assert MODULE.HINDSIGHT_AUTH_FILE.is_symlink()
    assert MODULE.restore_nous_provider_from_shared_store() is False

print("Hermes Nous auth preparation checks passed")
