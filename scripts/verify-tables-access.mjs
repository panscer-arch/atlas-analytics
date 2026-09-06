import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const deploy = await readFile(".github/workflows/deploy.yml", "utf8");
assert.match(
  deploy,
  /location = \/api\/content\/supersus\.tables\.v1 \{[^}]*proxy_set_header Origin \$http_origin;/,
  "Tables proxy must preserve browser Origin in its own exact route",
);

const dir = await mkdtemp(path.join(os.tmpdir(), "tables-access-"));
const port = 22000 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["server/content-api.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ATLAS_CONTENT_API_PORT: String(port),
    ATLAS_CONTENT_STORE_DIR: dir,
    TELEGRAM_BOT_TOKEN: "",
  },
  stdio: "ignore",
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/content/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "API started");

  const endpoint = `${base}/api/content/supersus.tables.v1`;
  assert.equal((await fetch(endpoint)).status, 401, "Tables read requires an existing SuperSus session");
  assert.equal((await fetch(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: { version: 1 } }),
  })).status, 401, "Anonymous write blocked");

  await writeFile(
    path.join(dir, "atlas.analytics.marketingBrowserLinkRequest.v1.json"),
    JSON.stringify({ code: "tables-test-only", expiresAt: new Date(Date.now() + 60_000).toISOString() }),
  );
  const login = await fetch(`${base}/api/marketing/browser-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "tables-test-only" }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const firstPayload = { version: 1, tables: [{ id: "growth", title: "Рост системы" }] };

  assert.equal((await fetch(endpoint, {
    method: "PUT",
    headers: { Cookie: cookie, Origin: "https://unrelated.example", "Content-Type": "application/json" },
    body: JSON.stringify({ value: firstPayload }),
  })).status, 403, "Cross-origin write blocked");
  assert.equal((await fetch(endpoint, {
    method: "PUT",
    headers: { Cookie: cookie, Origin: "https://supersussystem.com", "Content-Type": "application/json" },
    body: JSON.stringify({ value: firstPayload }),
  })).status, 200, "Production origin works behind an internal proxy host");

  const firstRead = await fetch(endpoint, { headers: { Cookie: cookie } });
  assert.equal(firstRead.status, 200);
  assert.deepEqual((await firstRead.json()).value, firstPayload);

  const secondPayload = { version: 1, tables: [{ id: "liquidity", title: "План ликвидности" }] };
  assert.equal((await fetch(endpoint, {
    method: "PUT",
    headers: { Cookie: cookie, Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ value: secondPayload }),
  })).status, 200, "Matching localhost origin works");
  const secondRead = await fetch(endpoint, { headers: { Cookie: cookie } });
  assert.deepEqual((await secondRead.json()).value, secondPayload);

  const backupFiles = await readdir(path.join(dir, "_backups", "supersus.tables.v1"));
  assert.ok(backupFiles.some((name) => name.endsWith(".json")), "Second save creates a server backup");
  const backupValue = JSON.parse(await readFile(path.join(dir, "_backups", "supersus.tables.v1", backupFiles[0]), "utf8"));
  assert.deepEqual(backupValue, firstPayload);

  console.log("SuperSus tables API access, persistence and backup verified.");
} finally {
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
  await rm(dir, { recursive: true, force: true });
}
