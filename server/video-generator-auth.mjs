import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const HOST = process.env.MPT_AUTH_HOST || "127.0.0.1";
const PORT = Number.parseInt(process.env.MPT_AUTH_PORT || "8511", 10);
const EXPECTED_PASSWORD_HASH = process.env.MPT_ACCESS_PASSWORD_HASH || "";
const SESSION_SECRET = process.env.MPT_SESSION_SECRET || "";
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const MAX_BODY_BYTES = 8 * 1024;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000;
const failedAttempts = new Map();

if (!/^[a-f0-9]{64}$/i.test(EXPECTED_PASSWORD_HASH)) {
  throw new Error("MPT_ACCESS_PASSWORD_HASH must be a SHA-256 hex digest");
}

if (SESSION_SECRET.length < 32) {
  throw new Error("MPT_SESSION_SECRET must contain at least 32 characters");
}

function send(response, status, body = "", headers = {}) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    ...headers,
  });
  response.end(body);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeNextPath(value) {
  if (typeof value !== "string" || !value.startsWith("/video-generator/") || value.startsWith("//")) {
    return "/video-generator/";
  }
  return value;
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), part.slice(index + 1)];
      }),
  );
}

function sign(payload) {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function createSessionCookie() {
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
    nonce: randomBytes(12).toString("hex"),
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function hasValidSession(request) {
  const token = parseCookies(request.headers.cookie).mpt_session;
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(session.expiresAt) && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

function renderLogin({ nextPath, error = "", lockedSeconds = 0 }) {
  const message = lockedSeconds > 0
    ? `Слишком много попыток. Повтори через ${lockedSeconds} сек.`
    : error;

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SuperSUS · Генерация видео</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; background: #0c1119; color: #f5f8fc; }
    main { width: min(100%, 430px); border: 1px solid rgba(255,255,255,.11); border-radius: 8px; padding: 28px; background: #141b27; box-shadow: 0 30px 80px rgba(0,0,0,.36); }
    .eyebrow { margin: 0 0 13px; color: #ff934c; font-size: 12px; font-weight: 850; text-transform: uppercase; }
    h1 { margin: 0; font-size: 31px; line-height: 1.05; }
    p { margin: 13px 0 0; color: rgba(218,229,243,.68); font-size: 14px; line-height: 1.55; }
    form { display: grid; gap: 12px; margin-top: 24px; }
    label { display: grid; gap: 7px; color: rgba(231,238,248,.78); font-size: 12px; font-weight: 750; }
    input { width: 100%; min-height: 48px; border: 1px solid rgba(255,255,255,.14); border-radius: 6px; padding: 0 13px; background: #0d131d; color: #fff; font: inherit; outline: none; }
    input:focus { border-color: #ff934c; box-shadow: 0 0 0 3px rgba(255,147,76,.13); }
    button { min-height: 48px; border: 0; border-radius: 6px; background: #ff8736; color: #111722; font: inherit; font-weight: 900; cursor: pointer; }
    button:hover { background: #ff9c58; }
    .error { margin-top: 14px; border-left: 3px solid #ff6d6d; padding: 10px 12px; background: rgba(255,109,109,.08); color: #ffc0c0; font-size: 13px; }
    footer { display: flex; gap: 8px; align-items: center; margin-top: 20px; color: rgba(203,216,232,.5); font-size: 11px; }
    footer span { width: 7px; height: 7px; border-radius: 50%; background: #52d69a; }
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">SuperSUS · Контент</div>
    <h1>Генерация видео</h1>
    <p>Для входа используй пароль SuperSUS. Сессия действует 12 часов только для видеогенератора.</p>
    ${message ? `<div class="error">${escapeHtml(message)}</div>` : ""}
    <form method="post" action="/video-generator-login">
      <input type="hidden" name="next" value="${escapeHtml(nextPath)}">
      <label>
        Пароль
        <input type="password" name="password" autocomplete="current-password" required autofocus>
      </label>
      <button type="submit">Открыть генератор</button>
    </form>
    <footer><span></span> Изолированный сервис MoneyPrinterTurbo</footer>
  </main>
</body>
</html>`;
}

async function readFormBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body is too large");
    chunks.push(chunk);
  }

  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

function getClientKey(request) {
  return String(request.headers["x-real-ip"] || request.socket.remoteAddress || "unknown");
}

function getAttemptState(clientKey) {
  const current = failedAttempts.get(clientKey);
  if (!current) return { count: 0, lockedUntil: 0 };
  if (current.lockedUntil && current.lockedUntil <= Date.now()) {
    failedAttempts.delete(clientKey);
    return { count: 0, lockedUntil: 0 };
  }
  return current;
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    send(response, 200, "ok", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/auth") {
    send(response, hasValidSession(request) ? 204 : 401);
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/login") {
    if (hasValidSession(request)) {
      send(response, 302, "", { Location: safeNextPath(requestUrl.searchParams.get("next")) });
      return;
    }

    const nextPath = safeNextPath(requestUrl.searchParams.get("next"));
    const attemptState = getAttemptState(getClientKey(request));
    const lockedSeconds = Math.max(0, Math.ceil((attemptState.lockedUntil - Date.now()) / 1000));
    send(response, 200, renderLogin({ nextPath, lockedSeconds }), { "Content-Type": "text/html; charset=utf-8" });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/login") {
    const clientKey = getClientKey(request);
    const attemptState = getAttemptState(clientKey);
    const lockedSeconds = Math.max(0, Math.ceil((attemptState.lockedUntil - Date.now()) / 1000));

    if (lockedSeconds > 0) {
      send(response, 429, renderLogin({ nextPath: "/video-generator/", lockedSeconds }), { "Content-Type": "text/html; charset=utf-8" });
      return;
    }

    try {
      const form = await readFormBody(request);
      const nextPath = safeNextPath(form.get("next"));
      const submittedHash = createHash("sha256").update(String(form.get("password") || "").trim()).digest("hex");
      const matches = timingSafeEqual(Buffer.from(submittedHash), Buffer.from(EXPECTED_PASSWORD_HASH));

      if (!matches) {
        const nextCount = attemptState.count + 1;
        const shouldLock = nextCount >= MAX_FAILED_ATTEMPTS;
        failedAttempts.set(clientKey, {
          count: shouldLock ? MAX_FAILED_ATTEMPTS : nextCount,
          lockedUntil: shouldLock ? Date.now() + LOCKOUT_MS : 0,
        });
        send(response, shouldLock ? 429 : 401, renderLogin({
          nextPath,
          error: shouldLock ? "" : "Неверный пароль",
          lockedSeconds: shouldLock ? Math.ceil(LOCKOUT_MS / 1000) : 0,
        }), { "Content-Type": "text/html; charset=utf-8" });
        return;
      }

      failedAttempts.delete(clientKey);
      send(response, 302, "", {
        Location: nextPath,
        "Set-Cookie": `mpt_session=${createSessionCookie()}; Path=/video-generator/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
      });
    } catch {
      send(response, 400, "Bad request", { "Content-Type": "text/plain; charset=utf-8" });
    }
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/logout") {
    send(response, 302, "", {
      Location: "/",
      "Set-Cookie": "mpt_session=; Path=/video-generator/; Max-Age=0; HttpOnly; Secure; SameSite=Strict",
    });
    return;
  }

  send(response, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
});

server.listen(PORT, HOST, () => {
  console.log(`Video generator auth listening on http://${HOST}:${PORT}`);
});
