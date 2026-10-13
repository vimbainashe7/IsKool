import { defineConfig } from "@playwright/test"
import base from "./playwright.config"
// Reuse the developer's existing preview server; do not restart it.
export default defineConfig({
  ...base,
  timeout: 120000,
  use: { ...base.use, baseURL: "http://localhost:3000" },
  webServer: undefined,
})
