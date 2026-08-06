import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(import.meta.dirname, "client"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@client": path.resolve(import.meta.dirname, "client/src"),
      "@server": path.resolve(import.meta.dirname, "server"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  server: {
    port: 4173,
    fs: {
      allow: [path.resolve(import.meta.dirname, "..", "..")],
    },
  },
  preview: {
    port: 4173,
  },
});
