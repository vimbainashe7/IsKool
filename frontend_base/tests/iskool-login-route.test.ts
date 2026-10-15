import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ login: vi.fn() }))

vi.mock("@/lib/iskool-auth/server", async (original) => ({
  ...(await original<typeof import("@/lib/iskool-auth/server")>()),
  loginWithIsKool: mocks.login,
}))

import { POST } from "@/app/api/auth/login/route"

const request = (body: unknown, origin = "http://localhost:3100") =>
  new Request("http://localhost:3100/api/auth/login", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.stubEnv("ISKOOL_SAMS_API_URL", "http://127.0.0.1:3002/api/v1")
  vi.stubEnv("ISKOOL_APS_API_URL", "http://127.0.0.1:3001/api/v1")
  mocks.login.mockResolvedValue({
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "student@example.test",
      displayName: "Student",
    },
    school: {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Alpha School",
    },
    membershipId: "33333333-3333-4333-8333-333333333333",
    roles: ["student"],
    allowedScopes: ["aps"],
    accessTokens: { aps: "aps.jwt.value" },
    refreshToken: "opaque-refresh-token",
  })
})

describe("IsKool login BFF", () => {
  it("keeps access and refresh tokens out of the response body and browser JavaScript", async () => {
    const response = await POST(
      request({ email: "student@example.test", password: "password-123" })
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ status: "AUTHENTICATED" })
    const cookies = response.headers.getSetCookie()
    const aps = cookies.find((cookie) => cookie.startsWith("iskool-aps-access="))
    const refresh = cookies.find((cookie) => cookie.startsWith("iskool-refresh="))
    expect(aps).toContain("HttpOnly")
    expect(refresh).toContain("HttpOnly")
    expect(JSON.stringify(body)).not.toContain("jwt")
    expect(response.headers.get("cache-control")).toContain("no-store")
  })

  it("rejects cross-origin credential submission", async () => {
    const response = await POST(
      request(
        { email: "student@example.test", password: "password-123" },
        "https://evil.example"
      )
    )
    expect(response.status).toBe(403)
    expect(mocks.login).not.toHaveBeenCalled()
  })

  it("returns school choices without issuing tokens", async () => {
    mocks.login.mockResolvedValue({
      status: "SCHOOL_SELECTION_REQUIRED",
      schools: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Alpha School",
          roles: ["registrar"],
          allowedScopes: ["sams"],
        },
      ],
    })
    const response = await POST(
      request({ email: "multi@example.test", password: "password-123" })
    )
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      code: "SCHOOL_SELECTION_REQUIRED",
      schools: [{ name: "Alpha School" }],
    })
    expect(response.headers.getSetCookie()).toEqual([])
  })
})
