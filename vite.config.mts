import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite"
import basicSsl from "@vitejs/plugin-basic-ssl"

export default defineConfig({
  plugins: [
    tailwindcss(),
    basicSsl()
  ],
  server: {
    host: true // Listen on all network interfaces (0.0.0.0)
    // HTTPS is enabled via basicSsl plugin
  }
});
