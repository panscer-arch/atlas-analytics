#!/usr/bin/env python3
import json
import os
import re
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


HOST = os.environ.get("HERMES_TELEGRAM_BRIDGE_HOST", "127.0.0.1")
PORT = int(os.environ.get("HERMES_TELEGRAM_BRIDGE_PORT", "9120"))
TOKEN = os.environ.get("HERMES_TELEGRAM_BRIDGE_TOKEN", "")
HERMES_HOME = os.environ.get("HERMES_HOME", "/opt/hermes")
HERMES_BIN = os.environ.get("HERMES_BIN", f"{HERMES_HOME}/.local/bin/hermes")
TIMEOUT_SECONDS = int(os.environ.get("HERMES_TELEGRAM_BRIDGE_TIMEOUT", "180"))


def json_response(handler, status, payload):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def session_name(source):
    chat_id = str(source.get("chatId") or "unknown")
    safe = re.sub(r"[^a-zA-Z0-9_.-]+", "-", chat_id).strip("-") or "unknown"
    return f"telegram-{safe}"


def build_prompt(payload):
    source = payload.get("source") or {}
    prompt = str(payload.get("prompt") or "").strip()
    author = source.get("authorName") or "unknown"
    chat = source.get("chatTitle") or source.get("chatId") or "telegram"
    message_url = source.get("messageUrl") or ""
    if payload.get("memoryOnly"):
        context = [
            "Ты получаешь внутреннюю запись долговременной памяти Telegram-чата для Суперсуса.",
            "Это не вопрос пользователя. Ничего не надо отправлять в Telegram.",
            "Запомни участника, стиль общения, внутренние шутки и контекст для будущих ответов.",
            f"Источник памяти: chat={chat}, author={author}",
            "",
            "Запись памяти:",
            prompt,
            "",
            "Ответь коротко только для лога: что именно зафиксировал.",
        ]
        return "\n".join(line for line in context if line != "")

    context = [
        "Ты отвечаешь Digitex из Telegram через SuperSUS-бота.",
        "Отвечай по-русски, коротко и практически. Если нужно запомнить решение или задачу, явно скажи, что зафиксировал.",
        f"Источник: chat={chat}, author={author}",
        f"Ссылка на сообщение: {message_url}" if message_url else "",
        "",
        "Сообщение:",
        prompt,
    ]
    return "\n".join(line for line in context if line != "")


class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[hermes-telegram-bridge] {self.address_string()} {fmt % args}", flush=True)

    def do_GET(self):
        if self.path == "/health":
            json_response(self, 200, {"ok": True})
            return
        json_response(self, 404, {"error": "not_found"})

    def do_POST(self):
        if self.path != "/message":
            json_response(self, 404, {"error": "not_found"})
            return

        if not TOKEN:
            json_response(self, 503, {"error": "bridge_token_not_configured"})
            return

        auth = self.headers.get("Authorization", "")
        if auth != f"Bearer {TOKEN}":
            json_response(self, 401, {"error": "unauthorized"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            json_response(self, 400, {"error": "invalid_json"})
            return

        prompt = str(payload.get("prompt") or "").strip()
        if not prompt:
            json_response(self, 400, {"error": "empty_prompt"})
            return

        env = os.environ.copy()
        env["HOME"] = HERMES_HOME
        env["HERMES_HOME"] = HERMES_HOME
        env["HERMES_ACCEPT_HOOKS"] = "1"

        try:
            result = subprocess.run(
                [
                    HERMES_BIN,
                    "--continue",
                    session_name(payload.get("source") or {}),
                    "--accept-hooks",
                    "-z",
                    build_prompt(payload),
                ],
                cwd=HERMES_HOME,
                env=env,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=TIMEOUT_SECONDS,
                check=False,
            )
        except subprocess.TimeoutExpired:
            json_response(self, 504, {"error": "hermes_timeout"})
            return

        if result.returncode != 0:
            error = (result.stderr or result.stdout or "hermes_failed").strip()[-1200:]
            json_response(self, 502, {"error": error})
            return

        json_response(self, 200, {"answer": (result.stdout or "").strip()})


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), BridgeHandler)
    print(f"[hermes-telegram-bridge] listening on {HOST}:{PORT}", flush=True)
    server.serve_forever()
