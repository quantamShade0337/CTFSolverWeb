import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// React plugin enables the automatic JSX runtime + Fast Refresh.
export default defineConfig({
  plugins: [react()],
});
