import { defineConfig } from "@playwright/test"
import base from "./playwright.config"
export default defineConfig({
  ...base,
  timeout: 120000,
  use: { ...base.use, baseURL: "http://localhost:3000" },
  webServer: undefined,
})
