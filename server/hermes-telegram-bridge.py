#!/usr/bin/env python3
import json
import os
import re
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


HOST = os.environ.get("HERMES_TELEGRAM_BRIDGE_HOST", "127.0.0.1")
PORT = int(os.environ.get("HERMES_TELEGRAM_BRIDGE_PORT", "9120"))
TOKEN = os.environ.get("HERMES_TELEGRAM_BRIDGE_TOKEN", "")
HERMES_HOME = os.environ.get("HERMES_HOME", "/opt/hermes")
HERMES_BIN = os.environ.get("HERMES_BIN", f"{HERMES_HOME}/.local/bin/hermes")
TIMEOUT_SECONDS = int(os.environ.get("HERMES_TELEGRAM_BRIDGE_TIMEOUT", "180"))
SESSION_LOCKS = {}
SESSION_LOCKS_GUARD = threading.Lock()


def json_response(handler, status, payload):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def session_name(source, memory_scope="chat"):
    if str(memory_scope or "").lower() == "global":
        return "global"
    chat_id = str(source.get("chatId") or "unknown")
    sign = "n" if chat_id.startswith("-") else "p" if chat_id[:1].isdigit() else ""
    safe = re.sub(r"[^a-zA-Z0-9_.-]+", "-", chat_id.lstrip("-")).strip("-") or "unknown"
    return f"chat-{sign}{safe}"


def build_prompt(payload):
    source = payload.get("source") or {}
    prompt = str(payload.get("prompt") or "").strip()
    author = source.get("authorName") or "unknown"
    chat = source.get("chatTitle") or source.get("chatId") or "telegram"
    message_url = source.get("messageUrl") or ""
    if payload.get("memoryOnly"):
        context = [
            "Это внутренняя запись долговременной памяти Telegram-чатов Atlas.",
            "Это не вопрос пользователя. Ничего не отправляй в Telegram.",
            "Сохрани факты, решения, задачи, идеи, участников, даты и ссылки на источники.",
            "Не превращай шутки, предположения и спорные реплики в подтверждённые решения.",
            f"Источник памяти: chat={chat}, author={author}",
            "",
            "Запись памяти:",
            prompt,
            "",
            "Ответь одной строкой только для технического лога: что принято в память.",
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


def get_session_lock(name):
    with SESSION_LOCKS_GUARD:
        return SESSION_LOCKS.setdefault(name, threading.Lock())


def run_hermes(prompt, source, memory_scope, env):
    name = session_name(source, memory_scope)
    with get_session_lock(name):
        continued = subprocess.run(
            [
                HERMES_BIN,
                "--continue",
                name,
                "--accept-hooks",
                "-z",
                prompt,
            ],
            cwd=HERMES_HOME,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=TIMEOUT_SECONDS,
            check=False,
        )
        combined = f"{continued.stdout}\n{continued.stderr}"
        if continued.returncode == 0 or "No session found matching" not in combined:
            return continued

        created = subprocess.run(
            [
                HERMES_BIN,
                "chat",
                "--query",
                prompt,
                "--source",
                "tool",
                "--quiet",
                "--accept-hooks",
            ],
            cwd=HERMES_HOME,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=TIMEOUT_SECONDS,
            check=False,
        )
        session_match = re.search(r"session_id:\s*([A-Za-z0-9_.-]+)", f"{created.stdout}\n{created.stderr}")
        if created.returncode == 0 and session_match:
            subprocess.run(
                [HERMES_BIN, "sessions", "rename", session_match.group(1), name],
                cwd=HERMES_HOME,
                env=env,
                text=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=30,
                check=False,
            )
        return created


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
            result = run_hermes(
                build_prompt(payload),
                payload.get("source") or {},
                payload.get("memoryScope") or "chat",
                env,
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
