import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Tailwind v4 via the Vite plugin — tokens live in src/styles/theme.css (@theme).
// No tailwind.config.js by design (PRD §13).
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
