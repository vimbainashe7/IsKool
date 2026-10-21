import { afterEach, describe, expect, it, vi } from "vitest"
import { GET, POST } from "@/app/api/assignments/[[...path]]/route"
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "test-aps-access" }) }),
}))
vi.mock("@/lib/iskool-auth/shared", () => ({
  getIsKoolApiUrls: () => ({ aps: "http://aps.example.test/api/v1" }),
  iskoolAuthCookies: { apsAccess: "test-access" },
}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
describe("assignment proxy request verification", () => {
  function request(origin = "http://127.0.0.1:3000") {
    return new Request("http://localhost:3000/api/assignments", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3000",
        origin,
        "content-type": "application/json",
      },
      body: JSON.stringify({ title: "Algebra" }),
    })
  }
  it("accepts the documented loopback browser origin when Next normalizes the internal URL", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("ISKOOL_DEV_LOOPBACK", "127.0.0.1")
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "created" }), { status: 201 })
      )
    vi.stubGlobal("fetch", fetch)
    expect(
      (await POST(request(), { params: Promise.resolve({}) })).status
    ).toBe(201)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it("rejects an external origin without contacting APS", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("ISKOOL_DEV_LOOPBACK", "127.0.0.1")
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    expect(
      (
        await POST(request("https://external.example.test"), {
          params: Promise.resolve({}),
        })
      ).status
    ).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
  it("does not permit the loopback alias in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ISKOOL_DEV_LOOPBACK", "127.0.0.1")
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    expect(
      (await POST(request(), { params: Promise.resolve({}) })).status
    ).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
  it("rejects caller-provided tenant filters", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    expect(
      (
        await GET(
          new Request("http://localhost:3000/api/assignments?schoolId=other"),
          { params: Promise.resolve({}) }
        )
      ).status
    ).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})
