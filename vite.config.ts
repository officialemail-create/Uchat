import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === "true" ? "/Uchat/" : "/",
  plugins: [react(), tailwind()],
  server: {
     allowedHosts: true,
    proxy: {
      // Proxy API requests to local backend during development
      // Change the target if your backend runs on a different port
      '/api': {
        target: `http://127.0.0.1:${process.env.API_PORT || '3000'}`,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        ws: true,
      },
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: resolve(__dirname, "src") },
      { find: /^@workspace\/(.*)$/, replacement: resolve(__dirname, "src/workspace/$1") },
    ],
  },
});
