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
        target: `http://localhost:${process.env.API_PORT || "3000"}`,
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxFbGlzZVxcXFxEZXNrdG9wXFxcXGVseXNlXFxcXFByb2dyYW1taW5nXFxcXHByb21pc2VcXFxcVWNoYXRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEVsaXNlXFxcXERlc2t0b3BcXFxcZWx5c2VcXFxcUHJvZ3JhbW1pbmdcXFxccHJvbWlzZVxcXFxVY2hhdFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvRWxpc2UvRGVza3RvcC9lbHlzZS9Qcm9ncmFtbWluZy9wcm9taXNlL1VjaGF0L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xyXG5pbXBvcnQgdGFpbHdpbmQgZnJvbSBcIkB0YWlsd2luZGNzcy92aXRlXCI7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwicGF0aFwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmQoKV0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwcm94eToge1xyXG4gICAgICAvLyBQcm94eSBBUEkgcmVxdWVzdHMgdG8gbG9jYWwgYmFja2VuZCBkdXJpbmcgZGV2ZWxvcG1lbnRcclxuICAgICAgLy8gQ2hhbmdlIHRoZSB0YXJnZXQgaWYgeW91ciBiYWNrZW5kIHJ1bnMgb24gYSBkaWZmZXJlbnQgcG9ydFxyXG4gICAgICAnL2FwaSc6IHtcclxuICAgICAgICB0YXJnZXQ6IGBodHRwOi8vbG9jYWxob3N0OiR7cHJvY2Vzcy5lbnYuQVBJX1BPUlQgfHwgJzMwMDAnfWAsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgsXHJcbiAgICAgICAgd3M6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IFtcclxuICAgICAgeyBmaW5kOiBcIkBcIiwgcmVwbGFjZW1lbnQ6IHJlc29sdmUoX19kaXJuYW1lLCBcInNyY1wiKSB9LFxyXG4gICAgICB7IGZpbmQ6IC9eQHdvcmtzcGFjZVxcLyguKikkLywgcmVwbGFjZW1lbnQ6IHJlc29sdmUoX19kaXJuYW1lLCBcInNyYy93b3Jrc3BhY2UvJDFcIikgfSxcclxuICAgIF0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBb1csU0FBUyxvQkFBb0I7QUFDalksT0FBTyxXQUFXO0FBQ2xCLE9BQU8sY0FBYztBQUNyQixTQUFTLGVBQWU7QUFIeEIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7QUFBQSxFQUM3QixRQUFRO0FBQUEsSUFDTixPQUFPO0FBQUE7QUFBQTtBQUFBLE1BR0wsUUFBUTtBQUFBLFFBQ04sUUFBUSxvQkFBb0IsUUFBUSxJQUFJLFlBQVksTUFBTTtBQUFBLFFBQzFELGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxRQUNSLFNBQVMsQ0FBQyxTQUFTO0FBQUEsUUFDbkIsSUFBSTtBQUFBLE1BQ047QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsRUFBRSxNQUFNLEtBQUssYUFBYSxRQUFRLGtDQUFXLEtBQUssRUFBRTtBQUFBLE1BQ3BELEVBQUUsTUFBTSxzQkFBc0IsYUFBYSxRQUFRLGtDQUFXLGtCQUFrQixFQUFFO0FBQUEsSUFDcEY7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
