import { defineConfig, devices } from "@playwright/test"
const port = process.env.ISKOOL_E2E_PORT ?? "3100"
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error("ISKOOL_E2E_PORT must be a valid local port.")
}
const baseURL = `http://localhost:${Number(port)}`
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI
      ? `node node_modules/next/dist/bin/next dev --port ${Number(port)}`
      : `pnpm dev --port ${Number(port)}`,
    url: `${baseURL}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      ISKOOL_ENABLE_DEMO: process.env.ISKOOL_LIVE_AUTH === "true" ? "false" : "true",
      NEXT_PUBLIC_ISKOOL_DEMO: process.env.ISKOOL_LIVE_AUTH === "true" ? "false" : "true",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
})
