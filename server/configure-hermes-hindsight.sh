#!/usr/bin/env bash
set -euo pipefail

HERMES_HOME="${HERMES_HOME:-/opt/hermes}"
HERMES_BIN="${HERMES_BIN:-$HERMES_HOME/.local/bin/hermes}"
HERMES_PYTHON="${HERMES_PYTHON:-$HERMES_HOME/.hermes/hermes-agent/venv/bin/python}"
MODE="${HINDSIGHT_MODE:-local_embedded}"
BANK_ID="${HINDSIGHT_BANK_ID:-atlas-global}"
LLM_PROVIDER="${HINDSIGHT_LLM_PROVIDER:-nous}"
LLM_MODEL="${HINDSIGHT_LLM_MODEL:-~openai/gpt-mini-latest}"
LLM_BASE_URL="${HINDSIGHT_API_LLM_BASE_URL:-https://inference-api.nousresearch.com/v1}"
INFERENCE_PROVIDER="${HERMES_INFERENCE_PROVIDER:-nous}"
INFERENCE_MODEL="${HERMES_INFERENCE_MODEL:-~openai/gpt-mini-latest}"
INFERENCE_BASE_URL="${HERMES_INFERENCE_BASE_URL:-https://inference-api.nousresearch.com/v1}"
CONFIG_DIR="$HERMES_HOME/hindsight"
CONFIG_FILE="$CONFIG_DIR/config.json"
ENV_FILE="$HERMES_HOME/.env"

if [ ! -x "$HERMES_BIN" ]; then
  echo "Hermes executable not found: $HERMES_BIN" >&2
  exit 1
fi

if [ ! -x "$HERMES_PYTHON" ]; then
  echo "Hermes Python not found: $HERMES_PYTHON" >&2
  exit 1
fi

if [ "$MODE" = "local_embedded" ]; then
  if [ "$LLM_PROVIDER" != "nous" ]; then
    if [ -z "${HINDSIGHT_LLM_API_KEY:-}" ] && ! grep -q '^HINDSIGHT_LLM_API_KEY=.' "$HERMES_HOME/.env" 2>/dev/null; then
      echo "HINDSIGHT_LLM_API_KEY is required for local_embedded mode" >&2
      exit 1
    fi
  fi
elif [ "$MODE" = "local_external" ]; then
  if [ -z "${HINDSIGHT_API_URL:-}" ]; then
    echo "HINDSIGHT_API_URL is required for local_external mode" >&2
    exit 1
  fi
elif [ "$MODE" = "cloud" ]; then
  if [ -z "${HINDSIGHT_API_KEY:-}" ] && ! grep -q '^HINDSIGHT_API_KEY=.' "$HERMES_HOME/.env" 2>/dev/null; then
    echo "HINDSIGHT_API_KEY is required for cloud mode" >&2
    exit 1
  fi
else
  echo "Unsupported HINDSIGHT_MODE: $MODE" >&2
  exit 1
fi

export HINDSIGHT_LLM_PROVIDER="$LLM_PROVIDER"
export HINDSIGHT_LLM_MODEL="$LLM_MODEL"
export HINDSIGHT_API_LLM_BASE_URL="$LLM_BASE_URL"

if [ "$MODE" = "local_embedded" ] && ! "$HERMES_PYTHON" -c 'import hindsight, hindsight_embed' >/dev/null 2>&1; then
  echo "Installing the free self-hosted Hindsight runtime into Hermes..."
  "$HERMES_PYTHON" -m pip install --quiet --upgrade hindsight-all
fi

# A custom OpenAI-compatible provider still needs a private static key. Nous
# uses the shared OAuth store and rotates its inference token automatically.
if [ "$INFERENCE_PROVIDER" = "custom" ] && ! grep -q '^OPENAI_API_KEY=.' "$ENV_FILE" 2>/dev/null; then
  inference_key="${OPENAI_API_KEY:-${HINDSIGHT_LLM_API_KEY:-}}"
  if [ -z "$inference_key" ] && [ -f "$ENV_FILE" ]; then
    inference_key="$(sed -n 's/^HINDSIGHT_LLM_API_KEY=//p' "$ENV_FILE" | tail -n 1)"
  fi
  if [ -z "$inference_key" ]; then
    echo "OPENAI_API_KEY or HINDSIGHT_LLM_API_KEY is required for Hermes inference" >&2
    exit 1
  fi
  printf 'OPENAI_API_KEY=%s\n' "$inference_key" >> "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

mkdir -p "$CONFIG_DIR"
python3 - "$CONFIG_FILE" <<'PY'
import json
import os
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
try:
    config = json.loads(path.read_text(encoding="utf-8"))
except (FileNotFoundError, json.JSONDecodeError):
    config = {}

config.update({
    "mode": os.environ.get("HINDSIGHT_MODE", "local_embedded"),
    "bank_id": os.environ.get("HINDSIGHT_BANK_ID", "atlas-global"),
    "bank_id_template": "atlas-{session}",
    "bank_mission": "Long-term operational memory of Atlas System: preserve people, chats, decisions, tasks, ideas, dates, sources, and relationships without inventing facts.",
    "bank_retain_mission": "Extract durable Atlas facts and decisions while keeping event ids, dates, chat names, authors, and source links. Treat jokes and hypotheses as non-decisions.",
    "recall_budget": "mid",
    "recall_prefetch_method": "recall",
    "recall_max_tokens": 4096,
    "recall_types": "observation",
    "memory_mode": "hybrid",
    "auto_retain": True,
    "auto_recall": True,
    "retain_async": True,
    "retain_every_n_turns": 1,
    "retain_context": "Atlas System Telegram archive and Hermes owner conversations",
    "retain_tags": ["project:atlas", "source:telegram", "memory:long-term"],
    "retain_source": "atlas-hermes-telegram",
    "retain_user_prefix": "Telegram participant",
    "retain_assistant_prefix": "Hermes",
    "idle_timeout": 300,
    "port_health_grace_timeout": 90,
})

if os.environ.get("HINDSIGHT_API_URL"):
    config["api_url"] = os.environ["HINDSIGHT_API_URL"]
if os.environ.get("HINDSIGHT_LLM_PROVIDER"):
    config["llm_provider"] = os.environ["HINDSIGHT_LLM_PROVIDER"]
if os.environ.get("HINDSIGHT_LLM_MODEL"):
    config["llm_model"] = os.environ["HINDSIGHT_LLM_MODEL"]
if os.environ.get("HINDSIGHT_API_LLM_BASE_URL"):
    config["llm_base_url"] = os.environ["HINDSIGHT_API_LLM_BASE_URL"]

temporary = path.with_suffix(".tmp")
temporary.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
temporary.replace(path)
PY

"$HERMES_BIN" config set memory.provider hindsight
"$HERMES_BIN" config set model.provider "$INFERENCE_PROVIDER"
"$HERMES_BIN" config set model.default "$INFERENCE_MODEL"
"$HERMES_BIN" config set model.base_url "$INFERENCE_BASE_URL"
"$HERMES_BIN" memory status

echo "Hindsight configured: mode=$MODE bank=$BANK_ID config=$CONFIG_FILE"
