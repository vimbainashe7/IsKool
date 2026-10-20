import { afterEach, beforeEach, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ cookie: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookie }),
}))
vi.mock("@/lib/iskool-auth/shared", () => ({
  iskoolAuthCookies: { samsAccess: "sams", apsAccess: "aps" },
  getIsKoolApiUrls: () => ({
    sams: "http://127.0.0.1:3002/api/v1",
    aps: "http://127.0.0.1:3001/api/v1",
  }),
}))
import { GET, PATCH, POST } from "@/app/api/school-settings/[[...path]]/route"
import { GET as logo } from "@/app/api/school-logo/route"
const params = (path?: string[]) => ({ params: Promise.resolve({ path }) })
beforeEach(() => mocks.cookie.mockReturnValue({ value: "unit-token" }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
it("requires a SAMS session and blocks cross-origin and arbitrary settings targets", async () => {
  mocks.cookie.mockReturnValue(undefined)
  expect(
    (await GET(new Request("http://localhost/api/school-settings"), params()))
      .status
  ).toBe(401)
  const fetcher = vi.fn()
  vi.stubGlobal("fetch", fetcher)
  expect(
    (
      await PATCH(
        new Request("http://localhost/api/school-settings", {
          method: "PATCH",
          headers: { origin: "https://foreign.example" },
        }),
        params()
      )
    ).status
  ).toBe(403)
  expect(
    (
      await GET(
        new Request("http://localhost/api/school-settings/foreign"),
        params(["foreign"])
      )
    ).status
  ).toBe(404)
  expect(fetcher).not.toHaveBeenCalled()
})
it("bounds uploads before forwarding and does not reflect provider failures", async () => {
  const fetcher = vi.fn()
  vi.stubGlobal("fetch", fetcher)
  const result = await POST(
    new Request("http://localhost/api/school-settings/logo", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "multipart/form-data; boundary=test",
      },
      body: "x".repeat(2 * 1024 * 1024 + 16385),
    }),
    params(["logo"])
  )
  expect(result.status).toBe(413)
  expect(fetcher).not.toHaveBeenCalled()
  fetcher.mockResolvedValue(
    Response.json(
      { error: { message: "sensitive provider diagnostic" } },
      { status: 500 }
    )
  )
  const failed = await GET(
    new Request("http://localhost/api/school-settings"),
    params()
  )
  expect(failed.status).toBe(500)
  expect(await failed.text()).not.toContain("sensitive")
})
it("reads the logo using APS credentials for academic-only users and keeps it private", async () => {
  mocks.cookie.mockImplementation((name: string) =>
    name === "aps" ? { value: "academic-unit-token" } : undefined
  )
  const fetcher = vi.fn().mockResolvedValue(
    new Response(new Uint8Array([82, 73, 70, 70]), {
      headers: { "content-type": "image/webp" },
    })
  )
  vi.stubGlobal("fetch", fetcher)
  const response = await logo()
  expect(response.status).toBe(200)
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(fetcher).toHaveBeenCalledWith(
    "http://127.0.0.1:3001/api/v1/auth/school-logo",
    expect.objectContaining({
      headers: expect.objectContaining({
        authorization: "Bearer academic-unit-token",
      }),
    })
  )
})
it("does not return unknown binary types or unauthenticated logos", async () => {
  mocks.cookie.mockReturnValue(undefined)
  expect((await logo()).status).toBe(401)
  mocks.cookie.mockReturnValue({ value: "unit-token" })
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } })
      )
  )
  expect((await logo()).status).toBe(502)
})

it("forwards the single multipart save with the server SAMS credential", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ school: { name: "School" } }, { status: 201 })
    )
  vi.stubGlobal("fetch", fetcher)
  const body = new FormData()
  body.set("name", "School")
  body.set("displayName", "Owner")
  body.set("schoolVersion", "1")
  body.set("profileVersion", "1")
  body.set("logoAction", "keep")
  const response = await POST(
    new Request("http://localhost/api/school-settings/save", {
      method: "POST",
      headers: { origin: "http://localhost" },
      body,
    }),
    params(["save"])
  )
  expect(response.status).toBe(201)
  expect(fetcher).toHaveBeenCalledOnce()
  expect(fetcher).toHaveBeenCalledWith(
    "http://127.0.0.1:3002/api/v1/school-settings/save",
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer unit-token" }),
    })
  )
})
