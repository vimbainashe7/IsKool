import { beforeEach, afterEach, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ cookie: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookie }),
}))
vi.mock("@/lib/iskool-auth/shared", () => ({
  iskoolAuthCookies: { apsAccess: "aps" },
  getIsKoolApiUrls: () => ({ aps: "http://127.0.0.1:3001/api/v1" }),
}))
import { GET } from "@/app/api/academic-context/[[...path]]/route"
const params = (path?: string[]) => ({ params: Promise.resolve({ path }) })
beforeEach(() => mocks.cookie.mockReturnValue({ value: "unit-actor-token" }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})
it("blocks arbitrary targets and tenant/actor filters before network access", async () => {
  const fetcher = vi.fn()
  vi.stubGlobal("fetch", fetcher)
  expect(
    (
      await GET(
        new Request(
          "http://localhost/api/academic-context/students/foreign/profile?role=student"
        ),
        params(["students", "foreign", "profile"])
      )
    ).status
  ).toBe(404)
  expect(
    (
      await GET(
        new Request(
          "http://localhost/api/academic-context?role=student&schoolId=foreign"
        ),
        params()
      )
    ).status
  ).toBe(400)
  expect(fetcher).not.toHaveBeenCalled()
})
it("uses only the APS HttpOnly credential and reports dependency failures honestly", async () => {
  mocks.cookie.mockReturnValue(undefined)
  expect(
    (
      await GET(
        new Request("http://localhost/api/academic-context?role=student"),
        params()
      )
    ).status
  ).toBe(401)
  mocks.cookie.mockReturnValue({ value: "unit-actor-token" })
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json(
        { error: { message: "private provider details" } },
        { status: 503 }
      )
    )
  vi.stubGlobal("fetch", fetcher)
  const response = await GET(
    new Request("http://localhost/api/academic-context?role=student"),
    params()
  )
  expect(response.status).toBe(503)
  expect(await response.text()).not.toContain("private provider")
  expect(fetcher).toHaveBeenCalledWith(
    "http://127.0.0.1:3001/api/v1/academic-context?role=student",
    expect.objectContaining({
      headers: expect.objectContaining({
        authorization: "Bearer unit-actor-token",
      }),
    })
  )
  expect(response.headers.get("cache-control")).toBe("private, no-store")
})
