import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const contentApiTarget = process.env.VITE_DEV_CONTENT_API_TARGET || "http://127.0.0.1:8787";

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
  const adminFinanceMvp = process.env.VITE_ADMIN_FINANCE_RELEASE_SCOPE === "mvp";
  const adminFinanceApiOnly = adminFinanceEntry
    && adminFinanceMvp
    && process.env.VITE_ADMIN_FINANCE_DATA_SOURCE === "api";
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
    define: {
      __ADMIN_FINANCE_API_ONLY__: JSON.stringify(adminFinanceApiOnly),
    },
    resolve: {
      alias: {
        "#admin-finance-app": resolve(process.cwd(), adminFinanceMvp
          ? "src/modules/admin-finance/AdminFinanceMvpApp.jsx"
          : "src/modules/admin-finance/AdminFinanceApp.jsx"),
      },
    },
    build: adminFinanceEntry
      ? {
          rollupOptions: {
            input: resolve(process.cwd(), "admin-finance.html"),
          },
        }
      : undefined,
    server: {
      proxy: {
        "/api/products": contentApiTarget,
        "/api/content": contentApiTarget,
        "/api/funnel": contentApiTarget,
        "/api/contracts": contentApiTarget,
        "/api/outreach": contentApiTarget,
        "/api/telegram": contentApiTarget,
        "/api/pools": contentApiTarget,
        "/api/youtrack": contentApiTarget,
        "/api/marketing": contentApiTarget,
        "/api/admin/v1": adminFinanceProxy,
      },
    },
    preview: {
      proxy: {
        "/api/products": "http://127.0.0.1:8787",
        "/api/admin/v1": adminFinanceProxy,
      },
    },
  };
});
