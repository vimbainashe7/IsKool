import { beforeEach, describe, it, expect, vi } from "vitest"
import { createDemoSession } from "@/dev/demo-session"
import { createWorkspaceFixture } from "@/dev/workspace-fixture"
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  load: vi.fn(),
  demo: vi.fn(),
  mutate: vi.fn(),
}))
vi.mock("@/features/context/get-current-session", () => ({
  getCurrentSession: mocks.session,
}))
vi.mock("@/features/workspace/server", () => ({ loadWorkspace: mocks.load }))
vi.mock("@/dev/demo-session", async (original) => ({
  ...(await original<typeof import("@/dev/demo-session")>()),
  canUseDemoSession: mocks.demo,
}))
vi.mock("@/dev/workspace-store", () => ({ mutateDemoWorkspace: mocks.mutate }))
import { GET, POST } from "@/app/api/workspace/route"
const request = (body: unknown, origin = "http://localhost:3100") =>
  new Request("http://localhost:3100/api/workspace", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  })
beforeEach(() => {
  mocks.session.mockResolvedValue(createDemoSession("teacher"))
  mocks.demo.mockReturnValue(true)
  mocks.load.mockResolvedValue(createWorkspaceFixture())
  mocks.mutate.mockResolvedValue({ message: "Saved" })
})
describe("Workspace HTTP boundary", () => {
  it("returns 401 instead of data for an expired session", async () => {
    mocks.session.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
    expect(mocks.load).not.toHaveBeenCalled()
  })
  it("does not cache authenticated projections", async () => {
    const result = await GET()
    expect(result.headers.get("cache-control")).toContain("no-store")
    expect((await result.json()).mode).toBe("demo")
  })
  it("denies direct student attempts at privileged mutation", async () => {
    mocks.session.mockResolvedValue(createDemoSession("student"))
    const result = await POST(
      request({
        action: "member.update",
        memberId: "student-1",
        roles: ["admin"],
        status: "active",
      })
    )
    expect(result.status).toBe(403)
    expect(mocks.mutate).not.toHaveBeenCalled()
  })
  it("denies cross-origin requests", async () => {
    expect(
      (
        await POST(
          request(
            {
              action: "class.save",
              name: "Class A",
              subject: "Math",
              yearLevel: "4",
            },
            "https://evil.example"
          )
        )
      ).status
    ).toBe(403)
  })
  it("rejects unvalidated payloads", async () =>
    expect(
      (
        await POST(
          request({ action: "grades.save", entries: [{ score: 90000 }] })
        )
      ).status
    ).toBe(400))
  it("fails safely when production mutation contract is unavailable", async () => {
    mocks.demo.mockReturnValue(false)
    const result = await POST(
      request({
        action: "assignment.save",
        classId: "class-1",
        title: "New work",
        instructions: "Solve these equations",
        totalMarks: 20,
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        latePolicy: "allow",
        resubmission: false,
        status: "draft",
      })
    )
    expect(result.status).toBe(503)
    expect(mocks.mutate).not.toHaveBeenCalled()
  })
  it("does not substitute fixtures when live reads fail", async () => {
    mocks.load.mockRejectedValue(new Error("SQL secret details"))
    const result = await GET()
    expect(result.status).toBe(503)
    expect(JSON.stringify(await result.json())).not.toContain("SQL")
  })
})
