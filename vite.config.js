import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5678,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('\n❌ Proxy Error:', err.message);
            console.error('🔍 Pastikan API server running di http://localhost:3000');
            console.error('💡 Jalankan: npm run dev:api\n');
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Log untuk debugging
            if (process.env.DEBUG) {
              console.log('→ Proxying:', req.method, req.url);
            }
          });
        },
      },
    },
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
