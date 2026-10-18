import { beforeEach, afterEach, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ cookie: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookie }),
}))
vi.mock("@/lib/iskool-auth/shared", () => ({
  iskoolAuthCookies: { samsAccess: "iskool-sams-access" },
  getIsKoolApiUrls: () => ({ sams: "http://127.0.0.1:3002/api/v1" }),
}))
import { GET, POST } from "@/app/api/sams/[...path]/route"
const params = (path: string[]) => ({ params: Promise.resolve({ path }) })
beforeEach(() => {
  mocks.cookie.mockReturnValue({ value: "test-token-notreal" })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
it("requires a SAMS session cookie", async () => {
  mocks.cookie.mockReturnValue(undefined)
  expect(
    (
      await GET(
        new Request("http://localhost/api/sams/students"),
        params(["students"])
      )
    ).status
  ).toBe(401)
})
it("denies cross-origin mutations before forwarding", async () => {
  const fetcher = vi.fn()
  vi.stubGlobal("fetch", fetcher)
  const response = await POST(
    new Request("http://localhost/api/sams/students", {
      method: "POST",
      headers: { origin: "https://foreign.example" },
      body: "{}",
    }),
    params(["students"])
  )
  expect(response.status).toBe(403)
  expect(fetcher).not.toHaveBeenCalled()
})
it("does not expose arbitrary authenticated proxy routes", async () => {
  expect(
    (
      await GET(
        new Request("http://localhost/api/sams/auth/context"),
        params(["auth", "context"])
      )
    ).status
  ).toBe(404)
})
it("bounds mutation body size", async () => {
  const fetcher = vi.fn()
  vi.stubGlobal("fetch", fetcher)
  const response = await POST(
    new Request("http://localhost/api/sams/students", {
      method: "POST",
      headers: { origin: "http://localhost" },
      body: "x".repeat(16_385),
    }),
    params(["students"])
  )
  expect(response.status).toBe(413)
  expect(fetcher).not.toHaveBeenCalled()
})
it("forwards only the server cookie and adds a request ID", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ items: [], nextCursor: null }))
  vi.stubGlobal("fetch", fetcher)
  const response = await GET(
    new Request("http://localhost/api/sams/students?limit=25", {
      headers: { authorization: "Bearer forged-browser-token" },
    }),
    params(["students"])
  )
  expect(response.status).toBe(200)
  expect(fetcher).toHaveBeenCalledWith(
    "http://127.0.0.1:3002/api/v1/students?limit=25",
    expect.objectContaining({
      headers: expect.objectContaining({
        authorization: "Bearer test-token-notreal",
        "x-request-id": expect.any(String),
      }),
    })
  )
  expect(response.headers.get("cache-control")).toBe("private, no-store")
})
it("redacts internal server failures", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: { message: "private database details" } },
          { status: 500 }
        )
      )
  )
  const response = await GET(
    new Request("http://localhost/api/sams/students"),
    params(["students"])
  )
  expect(response.status).toBe(500)
  expect(await response.text()).not.toContain("private database details")
})
