import { defineConfig } from "astro/config";

const base = process.env.BASE_PATH || "/";
const site = process.env.SITE_URL || "http://localhost:4321";

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "always",
  // Bind IPv4 so the QA scripts (and `localhost`) reach the dev server on every OS.
  server: {
    host: "127.0.0.1",
  },
  build: {
    format: "directory",
  },
});
