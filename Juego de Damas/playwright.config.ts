import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    launchOptions: existsSync(edgePath) ? { executablePath: edgePath } : undefined,
  },
  webServer: {
    command: "powershell -ExecutionPolicy Bypass -Command \"Set-Location 'apps/web'; bun run dev -- --host 127.0.0.1 --port 4173\"",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
