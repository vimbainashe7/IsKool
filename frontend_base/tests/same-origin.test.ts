import { expect, it } from "vitest"
import { isSameOrigin } from "@/lib/auth/same-origin"

const local = { NODE_ENV: "development", ISKOOL_DEV_LOOPBACK: "127.0.0.1" } as NodeJS.ProcessEnv
function request(origin?: string, host = "127.0.0.1:3000") {
  return new Request("http://localhost:3000/api/auth/login", { headers: { host, ...(origin ? { origin } : {}) } })
}
it("accepts the actual browser origin on verified loopback development despite Next's URL normalization", () => {
  expect(isSameOrigin(request("http://127.0.0.1:3000"), local)).toBe(true)
})
it.each([undefined, "null", "https://evil.test", "http://localhost.evil:3000", "http://127.0.0.1:3001"])("rejects a missing/foreign origin %s", (origin) => {
  expect(isSameOrigin(request(origin), local)).toBe(false)
})
it("preserves strict origin matching in production and outside the loopback launcher", () => {
  expect(isSameOrigin(request("http://127.0.0.1:3000"), { ...local, NODE_ENV: "production" })).toBe(false)
  expect(isSameOrigin(request("http://127.0.0.1:3000"), { NODE_ENV: "development" })).toBe(false)
  expect(isSameOrigin(request("http://localhost:3000"), { NODE_ENV: "production" })).toBe(true)
})
