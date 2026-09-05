import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { officePreview } from "./server/office-preview.mjs";

const contentApiTarget = process.env.VITE_DEV_CONTENT_API_TARGET || "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react(), officePreview()],
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
    },
  },
  preview: {
    proxy: {
      "/api/products": "http://127.0.0.1:8787",
    },
  },
});
