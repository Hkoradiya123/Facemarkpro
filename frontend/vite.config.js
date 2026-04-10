import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const configuredBackendOrigin = env.VITE_BACKEND_ORIGIN || "http://localhost:5000";
  let backendTarget = configuredBackendOrigin;

  try {
    const parsed = new URL(configuredBackendOrigin);
    const isLocalHost = ["localhost", "127.0.0.1"].includes(parsed.hostname);
    const hasExplicitPort = Boolean(parsed.port);
    if (isLocalHost && !hasExplicitPort) {
      parsed.port = "5000";
      backendTarget = parsed.toString().replace(/\/$/, "");
    }
  } catch {
    backendTarget = "http://localhost:5000";
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/attendance": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/register_student_face": {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
