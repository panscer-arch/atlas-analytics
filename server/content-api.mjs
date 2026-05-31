import http from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { addTelegramTask, appendTelegramOperation, collectTasks, CONTENT_KEYS, readContent } from "./telegram-task-store.mjs";

const PORT = Number(process.env.ATLAS_CONTENT_API_PORT || 8787);
const STORE_DIR = process.env.ATLAS_CONTENT_STORE_DIR || "/var/lib/atlas-analytics-content";
const BACKUP_DIR = path.join(STORE_DIR, "_backups");
const MAX_BODY_BYTES = 10 * 1024 * 1024;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function getContentKey(url) {
  const match = url.pathname.match(/^\/api\/content\/([a-zA-Z0-9._-]+)$/);
  return match?.[1] || "";
}

async function readBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("request_body_too_large");
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function filePathForKey(key) {
  return path.join(STORE_DIR, `${key}.json`);
}

async function backupExistingContent(key, targetPath) {
  try {
    const raw = await readFile(targetPath, "utf8");
    const keyBackupDir = path.join(BACKUP_DIR, key);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    await mkdir(keyBackupDir, { recursive: true });
    await writeFile(path.join(keyBackupDir, `${timestamp}.json`), raw, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await mkdir(STORE_DIR, { recursive: true });

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/api/content/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/telegram/tasks" && request.method === "GET") {
      const category = url.searchParams.get("category") || "";
      const assignee = url.searchParams.get("assignee") || "";
      const tasks = await collectTasks({ category, assignee, onlyActive: url.searchParams.get("all") !== "1" });
      sendJson(response, 200, { ok: true, tasks });
      return;
    }

    if (url.pathname === "/api/telegram/tasks" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const result = await addTelegramTask(parsed);
      sendJson(response, 201, { ok: true, ...result });
      return;
    }

    if (url.pathname === "/api/telegram/ops" && request.method === "GET") {
      const ops = await readContent(CONTENT_KEYS.telegramOps, { decisions: [], questions: [], reports: [], reminders: [] });
      sendJson(response, 200, { ok: true, value: ops });
      return;
    }

    if (url.pathname === "/api/telegram/ops" && request.method === "POST") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const type = parsed.type || "";
      if (!["decisions", "questions", "reports", "reminders"].includes(type)) {
        sendJson(response, 400, { ok: false, error: "invalid_operation_type" });
        return;
      }
      const entry = await appendTelegramOperation(type, parsed.payload || parsed);
      sendJson(response, 201, { ok: true, entry });
      return;
    }

    const key = getContentKey(url);
    if (!key) {
      sendJson(response, 404, { ok: false, error: "not_found" });
      return;
    }

    if (request.method === "GET") {
      try {
        const raw = await readFile(filePathForKey(key), "utf8");
        sendJson(response, 200, { ok: true, exists: true, value: JSON.parse(raw) });
      } catch (error) {
        if (error?.code === "ENOENT") {
          sendJson(response, 200, { ok: true, exists: false, value: null });
          return;
        }
        throw error;
      }
      return;
    }

    if (request.method === "PUT") {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const value = Object.prototype.hasOwnProperty.call(parsed, "value") ? parsed.value : parsed;
      const targetPath = filePathForKey(key);
      const tempPath = `${targetPath}.${Date.now()}.tmp`;

      await backupExistingContent(key, targetPath);
      await writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
      await rename(tempPath, targetPath);
      sendJson(response, 200, { ok: true, exists: true });
      return;
    }

    sendJson(response, 405, { ok: false, error: "method_not_allowed" });
  } catch (error) {
    const statusCode = error?.message === "request_body_too_large" ? 413 : 500;
    sendJson(response, statusCode, { ok: false, error: error?.message || "server_error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Atlas content API listening on 127.0.0.1:${PORT}`);
});
