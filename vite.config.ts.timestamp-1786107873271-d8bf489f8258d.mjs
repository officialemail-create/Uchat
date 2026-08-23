// vite.config.ts
import { defineConfig } from "file:///C:/Users/Elise/Desktop/elyse/Programming/promise/Uchat/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Elise/Desktop/elyse/Programming/promise/Uchat/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwind from "file:///C:/Users/Elise/Desktop/elyse/Programming/promise/Uchat/node_modules/@tailwindcss/vite/dist/index.mjs";
import { resolve } from "path";
var __vite_injected_original_dirname = "C:\\Users\\Elise\\Desktop\\elyse\\Programming\\promise\\Uchat";
var vite_config_default = defineConfig({
  plugins: [react(), tailwind()],
  server: {
    proxy: {
      // Proxy API requests to local backend during development
      // Change the target if your backend runs on a different port
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        ws: true
      }
    }
  },
  resolve: {
    alias: [
      { find: "@", replacement: resolve(__vite_injected_original_dirname, "src") },
      { find: /^@workspace\/(.*)$/, replacement: resolve(__vite_injected_original_dirname, "src/workspace/$1") }
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxFbGlzZVxcXFxEZXNrdG9wXFxcXGVseXNlXFxcXFByb2dyYW1taW5nXFxcXHByb21pc2VcXFxcVWNoYXRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEVsaXNlXFxcXERlc2t0b3BcXFxcZWx5c2VcXFxcUHJvZ3JhbW1pbmdcXFxccHJvbWlzZVxcXFxVY2hhdFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvRWxpc2UvRGVza3RvcC9lbHlzZS9Qcm9ncmFtbWluZy9wcm9taXNlL1VjaGF0L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xyXG5pbXBvcnQgdGFpbHdpbmQgZnJvbSBcIkB0YWlsd2luZGNzcy92aXRlXCI7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwicGF0aFwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmQoKV0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwcm94eToge1xyXG4gICAgICAvLyBQcm94eSBBUEkgcmVxdWVzdHMgdG8gbG9jYWwgYmFja2VuZCBkdXJpbmcgZGV2ZWxvcG1lbnRcclxuICAgICAgLy8gQ2hhbmdlIHRoZSB0YXJnZXQgaWYgeW91ciBiYWNrZW5kIHJ1bnMgb24gYSBkaWZmZXJlbnQgcG9ydFxyXG4gICAgICAnL2FwaSc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjMwMDEnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxyXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLFxyXG4gICAgICAgIHdzOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiBbXHJcbiAgICAgIHsgZmluZDogXCJAXCIsIHJlcGxhY2VtZW50OiByZXNvbHZlKF9fZGlybmFtZSwgXCJzcmNcIikgfSxcclxuICAgICAgeyBmaW5kOiAvXkB3b3Jrc3BhY2VcXC8oLiopJC8sIHJlcGxhY2VtZW50OiByZXNvbHZlKF9fZGlybmFtZSwgXCJzcmMvd29ya3NwYWNlLyQxXCIpIH0sXHJcbiAgICBdLFxyXG4gIH0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9XLFNBQVMsb0JBQW9CO0FBQ2pZLE9BQU8sV0FBVztBQUNsQixPQUFPLGNBQWM7QUFDckIsU0FBUyxlQUFlO0FBSHhCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO0FBQUEsRUFDN0IsUUFBUTtBQUFBLElBQ04sT0FBTztBQUFBO0FBQUE7QUFBQSxNQUdMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxRQUNSLFNBQVMsQ0FBQyxTQUFTO0FBQUEsUUFDbkIsSUFBSTtBQUFBLE1BQ047QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsRUFBRSxNQUFNLEtBQUssYUFBYSxRQUFRLGtDQUFXLEtBQUssRUFBRTtBQUFBLE1BQ3BELEVBQUUsTUFBTSxzQkFBc0IsYUFBYSxRQUFRLGtDQUFXLGtCQUFrQixFQUFFO0FBQUEsSUFDcEY7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
