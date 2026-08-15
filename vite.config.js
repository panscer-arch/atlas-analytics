import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

function adminFinanceFallback(enabled) {
  const install = (server) => {
    server.middlewares.use((request, _response, next) => {
      if (!enabled || !request.url) return next();
      const url = new URL(request.url, "http://127.0.0.1");
      if (/^\/admin(?:\/|$)/.test(url.pathname)) {
        request.url = `/admin-finance.html${url.search}`;
      }
      return next();
    });
  };

  return {
    name: "atlas-admin-finance-fallback",
    configureServer: install,
    configurePreviewServer: install,
  };
}

export default defineConfig(() => {
  const localCaptureSession = process.env.ATLAS_ADMIN_FINANCE_CAPTURE_SESSION;
  const adminFinanceEntry = process.env.VITE_APP_ENTRY === "admin-finance";
  const adminFinanceProxy = localCaptureSession
    ? {
        target: "http://127.0.0.1:8791",
        configure(proxy) {
          proxy.on("proxyReq", (proxyRequest) => {
            proxyRequest.setHeader("Cookie", `__Host-atlas_admin_session=${localCaptureSession}`);
          });
        },
      }
    : "http://127.0.0.1:8791";

  return {
    plugins: [adminFinanceFallback(adminFinanceEntry), react()],
    build: adminFinanceEntry
      ? {
          rollupOptions: {
            input: resolve(process.cwd(), "admin-finance.html"),
          },
        }
      : undefined,
    server: {
      proxy: {
      "/api/content": "http://127.0.0.1:8787",
      "/api/funnel": "http://127.0.0.1:8787",
      "/api/contracts": "http://127.0.0.1:8787",
      "/api/outreach": "http://127.0.0.1:8787",
      "/api/telegram": "http://127.0.0.1:8787",
      "/api/pools": "http://127.0.0.1:8787",
      "/api/youtrack": "http://127.0.0.1:8787",
      "/api/marketing": "http://127.0.0.1:8787",
        "/api/admin/v1": adminFinanceProxy,
      },
    },
    preview: {
      proxy: {
        "/api/admin/v1": adminFinanceProxy,
      },
    },
  };
});
