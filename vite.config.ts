import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::", // allows external access
    port: 8080,
    hmr: {
      overlay: false,
    },
    // ✅ allow ngrok + localhost

    allowedHosts: [
      "localhost",
      "localhost:8080",
      "localhost:8081",
      "d85a-62-8-79-110.ngrok-free.app",
      "b084-62-8-79-110.ngrok-free.app",
      "salesconnect-hub.onrender.com",
    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean,
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
