import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), tanstackStart(), react()],
  server: {
    port: Number(process.env.WEB_PORT ?? 3000),
    host: "0.0.0.0",
  },
  preview: {
    port: Number(process.env.WEB_PORT ?? 3000),
    host: "0.0.0.0",
  },
});
