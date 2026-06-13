import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const clerkPublishableKey = env.VITE_CLERK_PUBLISHABLE_KEY || env.CLERK_PUBLISHABLE_KEY || "";
  const port = Number(env.WEB_PORT ?? 3000);

  return {
    define: {
      "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify(clerkPublishableKey),
    },
    plugins: [tsconfigPaths(), tanstackStart(), react()],
    server: {
      port,
      host: "0.0.0.0",
    },
    preview: {
      port,
      host: "0.0.0.0",
    },
  };
});
