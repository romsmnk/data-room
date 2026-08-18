import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  // @data-room/shared is a linked workspace package (CJS output); force esbuild
  // to pre-bundle/convert it like a normal dependency instead of serving the
  // raw CJS file as ESM (which the browser can't statically import from).
  optimizeDeps: {
    include: ["@data-room/shared"],
  },
  build: {
    commonjsOptions: {
      include: [/shared/, /node_modules/],
    },
  },
  server: {
    port: 5173,
  },
});
