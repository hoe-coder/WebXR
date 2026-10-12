import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
export default defineConfig({
    plugins: [
        tailwindcss(),
        basicSsl()
    ],
    server: {
        host: true, // Listen on all network interfaces
        https: true // Enable HTTPS with auto-generated certificate
    }
});
