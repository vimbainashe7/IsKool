import { afterEach, expect, it, vi } from "vitest"
import { loginWithIsKool } from "@/lib/iskool-auth/server"

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it.each([
  ["development", "127.0.0.1", "http://127.0.0.1:3002/api/v1", 30_000],
  ["production", "127.0.0.1", "http://127.0.0.1:3002/api/v1", 10_000],
  ["development", "", "http://127.0.0.1:3002/api/v1", 10_000],
  ["development", "127.0.0.1", "https://api.example.test/api/v1", 10_000],
])("uses a bounded request budget for %s/%s/%s", async (environment, marker, url, timeout) => {
  vi.stubEnv("NODE_ENV", environment)
  vi.stubEnv("ISKOOL_DEV_LOOPBACK", marker)
  vi.stubEnv("ISKOOL_SAMS_API_URL", url)
  vi.stubEnv("ISKOOL_APS_API_URL", "http://127.0.0.1:3001/api/v1")
  const timeoutSpy = vi.spyOn(AbortSignal, "timeout")
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    user: { id: "11111111-1111-4111-8111-111111111111", email: "student@example.test", displayName: "Student" },
    school: { id: "22222222-2222-4222-8222-222222222222", name: "School" },
    membershipId: "33333333-3333-4333-8333-333333333333", roles: ["student"],
    accessTokens: { aps: "unit-access" }, refreshToken: "unit-refresh", allowedScopes: ["aps"],
  }), { status: 201 })))
  await loginWithIsKool({ email: "student@example.test", password: "unit-fixture-only" })
  expect(timeoutSpy).toHaveBeenCalledWith(timeout)
})
