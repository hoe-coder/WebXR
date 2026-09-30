import type { UserConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";

export default {
  plugins: [
    tailwindcss(),
  ],
} satisfies UserConfig
