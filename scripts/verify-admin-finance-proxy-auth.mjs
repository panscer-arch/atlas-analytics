import assert from "node:assert/strict";
import { once } from "node:events";
import { createAdminFinanceServer } from "../server/admin-finance-api.mjs";

const proxySharedSecret = "test-proxy-shared-secret-00000000000000000001";
const cursorSecret = "test-proxy-cursor-secret-00000000000000000001";
const requiredGroup = "atlas-finance-admin";
const allowedOrigin = "https://finance-admin.staging.example";

assert.throws(
  () => createAdminFinanceServer({
    mode: "demo",
    authMode: "proxy",
    proxySharedSecret: "short",
    proxyRequiredGroup: requiredGroup,
    cursorSecret,
    allowedOrigins: [allowedOrigin],
  }),
  /at least 32 characters/,
);
assert.throws(
  () => createAdminFinanceServer({
    mode: "demo",
    authMode: "proxy",
    proxySharedSecret,
    proxyRequiredGroup: "bad group",
    cursorSecret,
    allowedOrigins: [allowedOrigin],
  }),
  /proxyRequiredGroup is invalid/,
);

const server = createAdminFinanceServer({
  mode: "demo",
  authMode: "proxy",
  proxySharedSecret,
  proxyRequiredGroup: requiredGroup,
  cursorSecret,
  allowedOrigins: [allowedOrigin],
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const baseUrl = `http://127.0.0.1:${server.address().port}/api/admin/v1/meta`;

async function request(headers = {}) {
  return fetch(baseUrl, { headers: { Origin: allowedOrigin, ...headers } });
}

try {
  const noGateway = await request({
    "X-Auth-Request-Email": "owner@example.com",
    "X-Auth-Request-Groups": requiredGroup,
  });
  assert.equal(noGateway.status, 401);
  assert.equal((await noGateway.json()).code, "admin_proxy_required");

  const legacyCookie = await request({
    Cookie: "__Host-atlas_admin_session=test-admin-session-token-000000000000000000000001",
  });
  assert.equal(legacyCookie.status, 401, "A local session cookie must not bypass proxy authentication");

  const wrongSecret = await request({
    "X-Atlas-Proxy-Secret": `${proxySharedSecret}-wrong`,
    "X-Auth-Request-Email": "owner@example.com",
    "X-Auth-Request-Groups": requiredGroup,
  });
  const wrongSecretBody = await wrongSecret.json();
  assert.equal(wrongSecret.status, 401);
  assert.equal(wrongSecretBody.code, "admin_proxy_required");
  assert(!JSON.stringify(wrongSecretBody).includes(proxySharedSecret));

  const missingIdentity = await request({ "X-Atlas-Proxy-Secret": proxySharedSecret });
  assert.equal(missingIdentity.status, 401);
  assert.equal((await missingIdentity.json()).code, "admin_identity_required");

  const missingRole = await request({
    "X-Atlas-Proxy-Secret": proxySharedSecret,
    "X-Auth-Request-Email": "analyst@example.com",
    "X-Auth-Request-Groups": "atlas-read-only,another-group",
  });
  assert.equal(missingRole.status, 403);
  assert.equal((await missingRole.json()).code, "admin_role_required");

  const malformedIdentity = await request({
    "X-Atlas-Proxy-Secret": proxySharedSecret,
    "X-Auth-Request-Email": "not-an-email",
    "X-Auth-Request-Groups": requiredGroup,
  });
  assert.equal(malformedIdentity.status, 401);

  const authorized = await request({
    "X-Atlas-Proxy-Secret": proxySharedSecret,
    "X-Auth-Request-Email": "finance.owner@example.com",
    "X-Auth-Request-Groups": `atlas-read-only,${requiredGroup}`,
  });
  assert.equal(authorized.status, 200);
  assert.equal((await authorized.json()).apiVersion, "1.0.0-draft");
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log("Admin Finance staging proxy authentication checks passed.");
