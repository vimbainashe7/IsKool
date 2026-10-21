import { afterEach, describe, it, expect, vi } from "vitest"
import { GET, POST } from "@/app/api/student-work/[[...path]]/route"
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "test-access" }) }),
}))
vi.mock("@/lib/iskool-auth/shared", () => ({
  getIsKoolApiUrls: () => ({ aps: "http://aps.example.test/api/v1" }),
  iskoolAuthCookies: { apsAccess: "test-access" },
}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
const id = "a9000000-0000-4000-8000-000000000001",
  params = { params: Promise.resolve({ path: [id, "submissions"] }) }
function request(origin = "http://127.0.0.1:3000", body = "{}") {
  return new Request(
    `http://localhost:3000/api/student-work/${id}/submissions`,
    {
      method: "POST",
      headers: {
        origin,
        host: "127.0.0.1:3000",
        "content-type": "application/json",
      },
      body,
    }
  )
}
describe("Student work proxy boundary", () => {
  it("uses the shared development loopback verification and forwards a mutation once", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("ISKOOL_DEV_LOOPBACK", "127.0.0.1")
    const f = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }))
    vi.stubGlobal("fetch", f)
    expect((await POST(request(), params)).status).toBe(201)
    expect(f).toHaveBeenCalledTimes(1)
  })
  it("blocks external origins without contacting APS", async () => {
    const f = vi.fn()
    vi.stubGlobal("fetch", f)
    expect(
      (await POST(request("https://external.example.test"), params)).status
    ).toBe(403)
    expect(f).not.toHaveBeenCalled()
  })
  it("rejects supplied school/student filters", async () => {
    const f = vi.fn()
    vi.stubGlobal("fetch", f)
    expect(
      (
        await GET(
          new Request("http://localhost:3000/api/student-work?studentId=other"),
          { params: Promise.resolve({}) }
        )
      ).status
    ).toBe(400)
    expect(f).not.toHaveBeenCalled()
  })
  it("bounds bodies even without Content-Length", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("ISKOOL_DEV_LOOPBACK", "127.0.0.1")
    expect(
      (await POST(request(undefined, "x".repeat(32769)), params)).status
    ).toBe(413)
  })
})
