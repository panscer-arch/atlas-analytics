#!/usr/bin/env python3
import importlib.util
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "server" / "hermes-telegram-bridge.py"
SPEC = importlib.util.spec_from_file_location("hermes_telegram_bridge", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


assert MODULE.session_name({"chatId": "-100123"}, "chat") == "chat-n100123"
assert MODULE.session_name({"chatId": "100123"}, "chat") == "chat-p100123"
assert MODULE.session_name({"chatId": "-100123"}, "global") == "global"

memory_prompt = MODULE.build_prompt({
    "memoryOnly": True,
    "prompt": "EVENT -100123:7:original",
    "source": {"chatId": "-100123", "chatTitle": "Atlas Team", "authorName": "Archive sync"},
})
assert "ничего не отправляй в telegram" in memory_prompt.lower()
assert "EVENT -100123:7:original" in memory_prompt

normal_prompt = MODULE.build_prompt({
    "prompt": "Что решили?",
    "source": {"chatId": "-100123", "chatTitle": "Atlas Team", "authorName": "Digitex"},
})
assert "Ты отвечаешь Digitex" in normal_prompt
assert "Что решили?" in normal_prompt

print("Hermes memory bridge checks passed")
