import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/content": "http://127.0.0.1:8787",
      "/api/outreach": "http://127.0.0.1:8787",
      "/api/telegram": "http://127.0.0.1:8787",
      "/api/pools": "http://127.0.0.1:8787",
      "/api/youtrack": "http://127.0.0.1:8787",
    },
  },
});
