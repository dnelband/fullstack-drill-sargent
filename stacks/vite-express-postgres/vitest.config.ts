import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@client": path.resolve(import.meta.dirname, "client/src"),
      "@server": path.resolve(import.meta.dirname, "server"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    hookTimeout: 30000,
    pool: "forks",
    sequence: {
      concurrent: false,
    },
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup-ui.ts"],
    reporters: ["./tests/reporters/challenge-summary.ts"],
    silent: true,
  },
});
