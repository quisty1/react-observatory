import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://127.0.0.1:3002",
      "/renders": "http://127.0.0.1:3002",
    },
  },
  build: { chunkSizeWarningLimit: 1100 },
  worker: { format: "es" },
});
