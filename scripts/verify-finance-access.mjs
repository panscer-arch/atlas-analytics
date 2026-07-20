import { spawn } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const storeDir = await mkdtemp(path.join(os.tmpdir(), "atlas-finance-access-"));
const port = 19300 + Math.floor(Math.random() * 500);
const password = "test-finance-password";
const financeSessionUrl = `http://127.0.0.1:${port}/api/content/finance-browser-session`;
let stderr = "";
const server = spawn(process.execPath, ["server/content-api.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ATLAS_CONTENT_API_PORT: String(port),
    ATLAS_CONTENT_STORE_DIR: storeDir,
    ATLAS_FINANCE_PASSWORD: password,
    TELEGRAM_BOT_TOKEN: "",
  },
  stdio: ["ignore", "ignore", "pipe"],
});
server.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/content/health`);
      if (response.ok) return;
    } catch {
      // The child process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Content API did not start: ${stderr}`);
}

try {
  await waitForServer();

  const key = "atlas.analytics.expenseCenter.v2";
  const contentUrl = `http://127.0.0.1:${port}/api/content/${key}`;
  const unauthorizedRead = await fetch(contentUrl);
  assert(unauthorizedRead.status === 401, "Finance data must require password access");

  const unauthorizedWrite = await fetch(contentUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: { version: 2, revision: 1 } }),
  });
  assert(unauthorizedWrite.status === 401, "Finance writes must require password access");

  const privateState = await fetch(
    `http://127.0.0.1:${port}/api/content/atlas.analytics.financeBrowserSessions.v1`,
  );
  assert(privateState.status === 404, "Finance session state must not be public");

  const anonymousLogout = await fetch(financeSessionUrl, {
    method: "DELETE",
  });
  assert(anonymousLogout.status === 200, "Anonymous finance logout must remain idempotent");
  const sessionStorePath = path.join(storeDir, "atlas.analytics.financeBrowserSessions.v1.json");
  const anonymousLogoutCreatedState = await access(sessionStorePath).then(() => true, () => false);
  assert(!anonymousLogoutCreatedState, "Anonymous logout must not write finance session state");

  await writeFile(
    path.join(storeDir, "atlas.analytics.marketingBrowserLinkRequest.v1.json"),
    JSON.stringify({
      code: "marketing-only-code",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }),
    "utf8",
  );
  const marketingLogin = await fetch(`http://127.0.0.1:${port}/api/marketing/browser-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "marketing-only-code" }),
  });
  const marketingCookie = String(marketingLogin.headers.get("set-cookie") || "").split(";")[0];
  const marketingFinanceRead = await fetch(contentUrl, { headers: { Cookie: marketingCookie } });
  assert(marketingFinanceRead.status === 401, "Marketing access must not unlock finance data");

  const wrongPassword = await fetch(financeSessionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "wrong-password" }),
  });
  assert(wrongPassword.status === 401, "Wrong finance password must be rejected");
  assert(!wrongPassword.headers.get("set-cookie"), "Wrong password must not create a cookie");

  const login = await fetch(financeSessionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  assert(login.status === 200, "Correct finance password must open access");
  const cookie = String(login.headers.get("set-cookie") || "").split(";")[0];
  assert(cookie.startsWith("atlas_finance_session="), "Finance access must use an HttpOnly cookie");

  const status = await fetch(financeSessionUrl, {
    headers: { Cookie: cookie },
  });
  const statusPayload = await status.json();
  assert(statusPayload.authorized === true, "Finance session status must confirm access");

  const emptyRead = await fetch(contentUrl, { headers: { Cookie: cookie } });
  const emptyPayload = await emptyRead.json();
  assert(emptyRead.status === 200 && emptyPayload.exists === false, "Authorized finance read must succeed");

  const savedValue = { version: 2, revision: 1, expenses: [], funds: [], budgets: [], activity: [] };
  const authorizedWrite = await fetch(contentUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ value: savedValue }),
  });
  assert(authorizedWrite.status === 200, "Authorized finance write must succeed");

  const savedRead = await fetch(contentUrl, { headers: { Cookie: cookie } });
  const savedPayload = await savedRead.json();
  assert(savedPayload.value?.revision === 1, "Saved finance data must survive a fresh read");

  const logout = await fetch(financeSessionUrl, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  assert(logout.status === 200, "Finance logout must succeed");
  assert(
    String(logout.headers.get("set-cookie") || "").includes("Max-Age=0"),
    "Finance logout must clear the browser cookie",
  );
  const revokedRead = await fetch(contentUrl, { headers: { Cookie: cookie } });
  assert(revokedRead.status === 401, "Logged-out finance cookies must be revoked server-side");

  const concurrentStatuses = await Promise.all(
    Array.from({ length: 16 }, async (_, attempt) => {
      const rejected = await fetch(financeSessionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Real-IP": "203.0.113.25",
          "X-Forwarded-For": `198.51.100.${attempt}`,
        },
        body: JSON.stringify({ password: `wrong-${attempt}` }),
      });
      return rejected.status;
    }),
  );
  assert(
    concurrentStatuses.filter((statusCode) => statusCode === 401).length === 8
      && concurrentStatuses.filter((statusCode) => statusCode === 429).length === 8,
    "Concurrent attempts and spoofed forwarding headers must share one rate limit",
  );
  const rateLimited = await fetch(financeSessionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Real-IP": "203.0.113.25" },
      body: JSON.stringify({ password }),
  });
  assert(rateLimited.status === 429, "Repeated password attempts must be rate limited");

  console.log("Finance password access verified: isolation, reject, unlock, read, write, reload, logout, and rate limit.");
} finally {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
  await rm(storeDir, { recursive: true, force: true });
}
