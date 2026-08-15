import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (name) => readFile(resolve(root, "deploy/admin-finance-staging", name), "utf8");
const [dockerfile, compose, forecastCompose, nginx, hostNginx, example, viteConfig] = await Promise.all([
  read("Dockerfile"),
  read("compose.yaml"),
  read("compose.forecast.yaml"),
  read("nginx.conf.template"),
  read("host-nginx.basic-auth.conf.template"),
  read(".env.example"),
  readFile(resolve(root, "vite.config.js"), "utf8"),
]);
const migrationManifest = JSON.parse(await readFile(resolve(root, "deploy/admin-finance-staging/migrations/manifest.v1.json"), "utf8"));

assert(dockerfile.includes("VITE_ADMIN_FINANCE_DATA_SOURCE=api"));
assert(dockerfile.includes("VITE_ADMIN_FINANCE_RELEASE_SCOPE=mvp"));
assert(dockerfile.includes("VITE_APP_ENTRY=admin-finance"));
assert(dockerfile.includes("COPY admin-finance.html vite.config.js ./"));
assert(dockerfile.includes("COPY scripts ./scripts"));
assert(dockerfile.includes("COPY server ./server"));
assert(dockerfile.includes("COPY .github ./.github"));
assert(!dockerfile.includes("COPY index.html vite.config.js ./"));
assert(dockerfile.includes("pnpm build:admin-finance-staging"));
assert(dockerfile.includes("pnpm test:admin-finance-staging-build"));
assert(dockerfile.includes("pnpm install --prod --frozen-lockfile --ignore-scripts"));
assert(dockerfile.includes("nginxinc/nginx-unprivileged:1.27.4-alpine"));
assert(!compose.includes("oauth2-proxy"));
assert(compose.includes("ATLAS_ADMIN_FINANCE_AUTH_MODE: session"));
assert(compose.includes('ATLAS_ADMIN_FINANCE_NOTIFICATIONS_ENABLED: "false"'));
assert(!compose.includes("ATLAS_ADMIN_FINANCE_FORECAST_ENABLED"));
assert(!compose.includes("ATLAS_ADMIN_FINANCE_TELEGRAM_TOKEN"));
assert(!compose.includes("ATLAS_ADMIN_FINANCE_EMAIL_API_KEY"));
assert(!compose.includes("ATLAS_ADMIN_FINANCE_MODE: demo"));
assert(forecastCompose.includes('ATLAS_ADMIN_FINANCE_FORECAST_ENABLED: "true"'));
assert(forecastCompose.includes("ATLAS_ADMIN_FINANCE_DATABASE_CA_HOST_FILE:?required"));
assert(forecastCompose.includes("/run/secrets/admin-finance-postgres-ca.pem:ro"));
assert(!forecastCompose.includes("ATLAS_ADMIN_FINANCE_NOTIFICATIONS_ENABLED"));
assert(compose.includes("ATLAS_ADMIN_FINANCE_SESSION_TOKEN: ${ATLAS_ADMIN_FINANCE_SESSION_TOKEN:?required}"));
assert(compose.includes("${ATLAS_ADMIN_FINANCE_STAGING_BIND:-127.0.0.1}"));
assert(compose.includes("/tmp:size=16m,uid=101,gid=101,mode=1777"));
const apiSection = compose.slice(compose.indexOf("  api:"), compose.indexOf("  web:"));
assert(!apiSection.includes("\n    ports:"), "API must not publish a host port");
assert(compose.includes("no-new-privileges:true"));
assert(compose.includes("cap_drop: [ALL]"));
assert(compose.includes("/api/admin/v1/health/ready"));
assert(!nginx.includes("auth_request"));
assert(nginx.includes("root /usr/share/nginx/html"));
assert(nginx.includes("proxy_set_header Authorization \"\""));
assert(nginx.includes('proxy_set_header Cookie "__Host-atlas_admin_session=${ATLAS_ADMIN_FINANCE_SESSION_TOKEN}"'));
assert(nginx.includes("try_files $uri $uri/ /admin-finance.html;"));
assert(nginx.includes("admin-finance\\.html$"));
assert(nginx.includes('X-Robots-Tag "noindex, nofollow, noarchive"'));
assert(!nginx.includes("/index.html"));
assert(!nginx.includes("$scheme://"), "OIDC redirects must not downgrade to the internal HTTP scheme");
assert(nginx.includes("location / {\n    return 404;"));
assert(hostNginx.includes('auth_basic "Atlas Finance"'));
assert(hostNginx.includes("auth_basic_user_file /etc/nginx/secrets/atlas-admin-finance.htpasswd"));
assert(hostNginx.includes("proxy_pass http://127.0.0.1:8088"));
assert(hostNginx.includes('proxy_set_header Authorization ""'));
assert(hostNginx.includes('proxy_set_header Cookie ""'));
assert(!hostNginx.includes("return 302 /admin/flows;"), "Authentication must run before the client-side MVP redirect");
assert(!example.includes("atlas-system.space"));
assert(!/=(?:[A-Za-z0-9+/]{32,}={0,2})$/m.test(example), "Example must not contain a plausible encoded secret");
assert(viteConfig.includes("admin-finance.html"));
assert(viteConfig.includes("configurePreviewServer"));
assert.equal(migrationManifest.status, "prepared_not_applied");
assert.equal(migrationManifest.notificationRuntime.enabledAfterMigration, false);

console.log("Admin Finance staging package checks passed.");
