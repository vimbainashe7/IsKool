import { beforeEach, afterEach, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ cookie: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookie }),
}))
vi.mock("@/lib/iskool-auth/shared", () => ({
  iskoolAuthCookies: { samsAccess: "iskool-sams-access" },
  getIsKoolApiUrls: () => ({ sams: "http://127.0.0.1:3002/api/v1" }),
}))
import { GET, POST, PATCH } from "@/app/api/sams/[...path]/route"
const params = (path: string[]) => ({ params: Promise.resolve({ path }) })
beforeEach(() => {
  mocks.cookie.mockReturnValue({ value: "test-token-notreal" })
})
afterEach(() => {
  vi.unstubAllEnvs()
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
it("retries a temporary GET dependency failure once inside the same deadline", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ error: {} }, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ items: [], nextCursor: null }))
  vi.stubGlobal("fetch", fetcher)
  expect(
    (
      await GET(
        new Request("http://localhost/api/sams/students"),
        params(["students"])
      )
    ).status
  ).toBe(200)
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls[0][1].signal).toBe(fetcher.mock.calls[1][1].signal)
})
it("bounds unsuccessful read retries and never turns them into a successful empty list", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(async () =>
      Response.json({ error: {} }, { status: 503 })
    )
  vi.stubGlobal("fetch", fetcher)
  expect(
    (
      await GET(
        new Request("http://localhost/api/sams/students"),
        params(["students"])
      )
    ).status
  ).toBe(503)
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it("never retries a mutation after a dependency failure", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(async () =>
      Response.json({ error: {} }, { status: 503 })
    )
  vi.stubGlobal("fetch", fetcher)
  expect(
    (
      await POST(
        new Request("http://localhost/api/sams/students", {
          method: "POST",
          headers: { origin: "http://localhost" },
          body: "{}",
        }),
        params(["students"])
      )
    ).status
  ).toBe(503)
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it("allows only the scoped account and class-choice filters", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(async () =>
      Response.json({ items: [], nextCursor: null })
    )
  vi.stubGlobal("fetch", fetcher)
  expect(
    (
      await GET(
        new Request(
          "http://localhost/api/sams/student-administration/accounts?role=student&search=Alpha"
        ),
        params(["student-administration", "accounts"])
      )
    ).status
  ).toBe(200)
  expect(
    (
      await GET(
        new Request(
          "http://localhost/api/sams/student-administration/classes?search=Form"
        ),
        params(["student-administration", "classes"])
      )
    ).status
  ).toBe(200)
  for (const path of [["students"], ["student-administration", "classes"]])
    expect(
      (
        await GET(
          new Request(`http://localhost/api/sams/${path.join("/")}?role=admin`),
          params(path)
        )
      ).status
    ).toBe(400)
  expect(
    (
      await GET(
        new Request(
          "http://localhost/api/sams/student-administration/accounts?schoolId=other"
        ),
        params(["student-administration", "accounts"])
      )
    ).status
  ).toBe(400)
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it("forwards account linking and teaching changes through the existing protected mutation boundary", async () => {
  const id = "a1000000-0000-4000-8000-000000000001"
  const fetcher = vi.fn().mockImplementation(async () => Response.json({ id }))
  vi.stubGlobal("fetch", fetcher)
  for (const path of [
    ["students", id, "account"],
    ["student-administration", "classes", id, "teachers", id],
  ]) {
    expect(
      (
        await PATCH(
          new Request(`http://localhost/api/sams/${path.join("/")}`, {
            method: "PATCH",
            headers: { origin: "http://localhost" },
            body: JSON.stringify({ version: 1 }),
          }),
          params(path)
        )
      ).status
    ).toBe(200)
  }
  expect(fetcher).toHaveBeenCalledTimes(2)
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

it("accepts the browser's 127.0.0.1 origin on the verified loopback launcher when Next normalizes its URL", async () => {
  vi.stubEnv("NODE_ENV", "development")
  vi.stubEnv("ISKOOL_DEV_LOOPBACK", "127.0.0.1")
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ id: "created" }, { status: 201 }))
  vi.stubGlobal("fetch", fetcher)
  const response = await POST(
    new Request("http://localhost:3000/api/sams/students", {
      method: "POST",
      headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" },
      body: JSON.stringify({
        admissionNumber: "ORIGIN-REGRESSION",
        givenName: "Local",
        familyName: "Learner",
      }),
    }),
    params(["students"])
  )
  expect(response.status).toBe(201)
  expect(fetcher).toHaveBeenCalledOnce()
})
