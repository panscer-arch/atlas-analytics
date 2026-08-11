import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/products": "http://127.0.0.1:8787",
      "/api/content": "http://127.0.0.1:8787",
      "/api/funnel": "http://127.0.0.1:8787",
      "/api/contracts": "http://127.0.0.1:8787",
      "/api/outreach": "http://127.0.0.1:8787",
      "/api/telegram": "http://127.0.0.1:8787",
      "/api/pools": "http://127.0.0.1:8787",
      "/api/youtrack": "http://127.0.0.1:8787",
      "/api/marketing": "http://127.0.0.1:8787",
    },
  },
  preview: {
    proxy: {
      "/api/products": "http://127.0.0.1:8787",
    },
  },
});
