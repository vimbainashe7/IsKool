import { afterEach, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "unit-session" }) }),
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => null }))
vi.mock("@/lib/iskool-auth/shared", () => ({
  isIsKoolAuthConfigured: () => true,
  getIsKoolApiUrls: () => ({ sams: "http://127.0.0.1:3002/api/v1" }),
  iskoolAuthCookies: { samsAccess: "sams" },
}))
vi.mock("@/dev/demo-session", () => ({ canUseDemoSession: () => false }))
import { loadWorkspace } from "@/features/workspace/server"
import type { IsKoolContext } from "@/features/context/session-contract"
const context: IsKoolContext = {
  user: { id: "user", name: "Admin" },
  school: { id: "school", name: "School" },
  membershipId: "member",
  roles: ["admin"],
  activeRole: "admin",
  capabilities: [],
}
afterEach(() => vi.unstubAllGlobals())
it("loads validated SAMS aggregates without treating students as accounts", async () => {
  const totals = {
    students: 42,
    activeStudents: 40,
    enrolledStudents: 30,
    activeEnrollments: 60,
    withoutClass: 10,
    classes: 4,
  }
  const fetcher = vi.fn().mockResolvedValue(Response.json(totals))
  vi.stubGlobal("fetch", fetcher)
  const workspace = await loadWorkspace(context)
  expect(workspace.studentSummary).toEqual(totals)
  expect(workspace.members).toEqual([])
  expect(fetcher).toHaveBeenCalledWith(
    "http://127.0.0.1:3002/api/v1/student-administration/summary",
    expect.objectContaining({ cache: "no-store" })
  )
})
it("keeps failed or malformed summary requests unavailable", async () => {
  for (const response of [
    Response.json({}, { status: 503 }),
    Response.json({ students: 0 }),
  ]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response))
    const workspace = await loadWorkspace(context)
    expect(workspace.studentSummary).toBeNull()
    expect(
      workspace.warnings.some((w) => w.includes("could not be loaded"))
    ).toBe(true)
  }
})
it("does not request privileged aggregates for a student", async () => {
  const fetcher = vi.fn()
  vi.stubGlobal("fetch", fetcher)
  expect(
    (
      await loadWorkspace({
        ...context,
        activeRole: "student",
        roles: ["student"],
      })
    ).studentSummary
  ).toBeNull()
  expect(fetcher).not.toHaveBeenCalled()
})
