import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const storeDir = await mkdtemp(path.join(os.tmpdir(), "atlas-marketing-monitor-api-"));
const port = 18800 + Math.floor(Math.random() * 500);
const server = spawn(process.execPath, ["server/content-api.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ATLAS_CONTENT_API_PORT: String(port),
    ATLAS_CONTENT_STORE_DIR: storeDir,
    ATLAS_INTERNAL_MONITOR_TOKEN: "test-internal-monitor-token",
    TELEGRAM_BOT_TOKEN: "",
  },
  stdio: ["ignore", "ignore", "pipe"],
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
  throw new Error("Content API did not start");
}

try {
  await waitForServer();

  for (const key of [
    "atlas.analytics.marketingTelegramBinding.v1",
    "atlas.analytics.marketingDashboardMonitor.state.v1",
    "atlas.analytics.marketingYoutubeMonitor.state.v1",
    "atlas.analytics.marketingBrowserLinkRequest.v1",
    "atlas.analytics.marketingBrowserSessions.v1",
  ]) {
    const getResponse = await fetch(`http://127.0.0.1:${port}/api/content/${key}`);
    assert(getResponse.status === 404, `${key} must not be readable through the public content API`);
    const putResponse = await fetch(`http://127.0.0.1:${port}/api/content/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: { chatId: "-100-attacker" } }),
    });
    assert(putResponse.status === 404, `${key} must not be writable through the public content API`);
  }

  const publicPost = await fetch(`http://127.0.0.1:${port}/api/marketing/dashboard-monitor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert(publicPost.status === 404, "The monitor mutation endpoint must not exist under the public API prefix");

  const publicYoutubePost = await fetch(`http://127.0.0.1:${port}/api/marketing/youtube-monitor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notify: true, force: true }),
  });
  assert(publicYoutubePost.status === 404, "The YouTube monitor mutation endpoint must be internal-only");

  const unauthorizedInternalPost = await fetch(`http://127.0.0.1:${port}/internal/marketing/dashboard-monitor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert(unauthorizedInternalPost.status === 403, "Internal monitor endpoints must require the server token");

  const dashboardKey = "atlas.analytics.marketingDashboard.v1";
  const unauthorizedWrite = await fetch(`http://127.0.0.1:${port}/api/content/${dashboardKey}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: { directions: {} } }),
  });
  assert(unauthorizedWrite.status === 401, "Marketing Dashboard writes must require a browser session");

  const accessCode = "test-browser-access-code";
  await writeFile(
    path.join(storeDir, "atlas.analytics.marketingBrowserLinkRequest.v1.json"),
    JSON.stringify({
      code: accessCode,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdBy: { id: 1 },
    }),
    "utf8",
  );
  const exchangeResponse = await fetch(`http://127.0.0.1:${port}/api/marketing/browser-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: accessCode }),
  });
  assert(exchangeResponse.status === 200, "A valid one-time code must create a browser session");
  const cookie = String(exchangeResponse.headers.get("set-cookie") || "").split(";")[0];
  assert(cookie.startsWith("atlas_marketing_session="), "Browser session must use a secure HttpOnly cookie");

  const authorizedWrite = await fetch(`http://127.0.0.1:${port}/api/content/${dashboardKey}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ value: { directions: {} } }),
  });
  assert(authorizedWrite.status === 200, "An authorized Marketing Dashboard write must succeed");

  const baselineRun = await fetch(`http://127.0.0.1:${port}/internal/marketing/dashboard-monitor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Atlas-Internal-Token": "test-internal-monitor-token",
    },
    body: JSON.stringify({ notify: false }),
  });
  const baselinePayload = await baselineRun.json();
  assert(baselineRun.status === 200 && baselinePayload.baselineCreated, "Authorized timer call must create a quiet baseline");

  const reusedCode = await fetch(`http://127.0.0.1:${port}/api/marketing/browser-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: accessCode }),
  });
  assert(reusedCode.status === 401, "The browser access code must be one-time");

  const concurrentCode = "test-concurrent-browser-access-code";
  await writeFile(
    path.join(storeDir, "atlas.analytics.marketingBrowserLinkRequest.v1.json"),
    JSON.stringify({
      code: concurrentCode,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdBy: { id: 1 },
    }),
    "utf8",
  );
  const concurrentStatuses = await Promise.all([1, 2].map(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/api/marketing/browser-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: concurrentCode }),
    });
    return response.status;
  }));
  assert(
    concurrentStatuses.sort().join(",") === "200,401",
    "Concurrent redemption must create exactly one browser session",
  );

  console.log("Marketing monitor API verified: private state, internal mutations, and authenticated Dashboard writes.");
} finally {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
  await rm(storeDir, { recursive: true, force: true });
}
