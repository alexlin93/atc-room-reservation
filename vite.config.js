import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This is deployed as a GitHub Pages *project* site (repo:
// alexlin93/atc-room-reservation, no custom domain / CNAME), which serves
// from https://alexlin93.github.io/atc-room-reservation/ — so built asset
// URLs need that repo-name base path, not root-relative paths (which would
// 404 once deployed).
export default defineConfig({
  base: "/atc-room-reservation/",
  plugins: [react()],
});
