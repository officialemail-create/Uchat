// vite.config.ts
import { defineConfig } from "file:///C:/Users/Elise/Desktop/elyse/Programming/promise/Uchat/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Elise/Desktop/elyse/Programming/promise/Uchat/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwind from "file:///C:/Users/Elise/Desktop/elyse/Programming/promise/Uchat/node_modules/@tailwindcss/vite/dist/index.mjs";
import { resolve } from "path";
var __vite_injected_original_dirname = "C:\\Users\\Elise\\Desktop\\elyse\\Programming\\promise\\Uchat";
var vite_config_default = defineConfig({
  plugins: [react(), tailwind()],
  server: {
    allowedHosts: true,
    proxy: {
      // Proxy API requests to local backend during development
      // Change the target if your backend runs on a different port
      "/api": {
        target: `http://127.0.0.1:${process.env.API_PORT || "3000"}`,
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxFbGlzZVxcXFxEZXNrdG9wXFxcXGVseXNlXFxcXFByb2dyYW1taW5nXFxcXHByb21pc2VcXFxcVWNoYXRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEVsaXNlXFxcXERlc2t0b3BcXFxcZWx5c2VcXFxcUHJvZ3JhbW1pbmdcXFxccHJvbWlzZVxcXFxVY2hhdFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvRWxpc2UvRGVza3RvcC9lbHlzZS9Qcm9ncmFtbWluZy9wcm9taXNlL1VjaGF0L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xyXG5pbXBvcnQgdGFpbHdpbmQgZnJvbSBcIkB0YWlsd2luZGNzcy92aXRlXCI7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwicGF0aFwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmQoKV0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICAgYWxsb3dlZEhvc3RzOiB0cnVlLFxyXG4gICAgcHJveHk6IHtcclxuICAgICAgLy8gUHJveHkgQVBJIHJlcXVlc3RzIHRvIGxvY2FsIGJhY2tlbmQgZHVyaW5nIGRldmVsb3BtZW50XHJcbiAgICAgIC8vIENoYW5nZSB0aGUgdGFyZ2V0IGlmIHlvdXIgYmFja2VuZCBydW5zIG9uIGEgZGlmZmVyZW50IHBvcnRcclxuICAgICAgJy9hcGknOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBgaHR0cDovLzEyNy4wLjAuMToke3Byb2Nlc3MuZW52LkFQSV9QT1JUIHx8ICczMDAwJ31gLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxyXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLFxyXG4gICAgICAgIHdzOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiBbXHJcbiAgICAgIHsgZmluZDogXCJAXCIsIHJlcGxhY2VtZW50OiByZXNvbHZlKF9fZGlybmFtZSwgXCJzcmNcIikgfSxcclxuICAgICAgeyBmaW5kOiAvXkB3b3Jrc3BhY2VcXC8oLiopJC8sIHJlcGxhY2VtZW50OiByZXNvbHZlKF9fZGlybmFtZSwgXCJzcmMvd29ya3NwYWNlLyQxXCIpIH0sXHJcbiAgICBdLFxyXG4gIH0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9XLFNBQVMsb0JBQW9CO0FBQ2pZLE9BQU8sV0FBVztBQUNsQixPQUFPLGNBQWM7QUFDckIsU0FBUyxlQUFlO0FBSHhCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO0FBQUEsRUFDN0IsUUFBUTtBQUFBLElBQ0wsY0FBYztBQUFBLElBQ2YsT0FBTztBQUFBO0FBQUE7QUFBQSxNQUdMLFFBQVE7QUFBQSxRQUNOLFFBQVEsb0JBQW9CLFFBQVEsSUFBSSxZQUFZLE1BQU07QUFBQSxRQUMxRCxjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsUUFDUixTQUFTLENBQUMsU0FBUztBQUFBLFFBQ25CLElBQUk7QUFBQSxNQUNOO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEVBQUUsTUFBTSxLQUFLLGFBQWEsUUFBUSxrQ0FBVyxLQUFLLEVBQUU7QUFBQSxNQUNwRCxFQUFFLE1BQU0sc0JBQXNCLGFBQWEsUUFBUSxrQ0FBVyxrQkFBa0IsRUFBRTtBQUFBLElBQ3BGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
