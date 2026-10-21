import { afterEach, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "unit-session" }) }),
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => null }))
vi.mock("@/lib/iskool-auth/shared", () => ({
  isIsKoolAuthConfigured: () => true,
  getIsKoolApiUrls: () => ({
    sams: "http://127.0.0.1:3002/api/v1",
    aps: "http://127.0.0.1:3001/api/v1",
  }),
  iskoolAuthCookies: { samsAccess: "sams", apsAccess: "aps" },
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
const academicPrincipal: IsKoolContext = {
  ...context,
  school: { id: "a1000000-0000-4000-8000-000000000001", name: "School" },
  membershipId: "a3000000-0000-4000-8000-000000000004",
  roles: ["student"],
  activeRole: "student",
}
const academic = {
  version: 1,
  schoolId: academicPrincipal.school.id,
  membershipId: academicPrincipal.membershipId,
  role: "student",
  asOf: "2026-10-21T08:00:00Z",
  student: null,
  classes: [],
  totalClasses: 0,
  nextCursor: null,
}
it("loads a bounded authorized dashboard projection through APS, including genuine zero", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json(academic))
  vi.stubGlobal("fetch", fetcher)
  const result = await loadWorkspace(academicPrincipal, {
    includeAcademic: true,
  })
  expect(result.academicContext).toEqual(academic)
  expect(fetcher).toHaveBeenCalledWith(
    "http://127.0.0.1:3001/api/v1/academic-context?role=student&limit=3",
    expect.objectContaining({
      cache: "no-store",
      headers: expect.objectContaining({
        authorization: "Bearer unit-session",
      }),
    })
  )
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it("fails closed on failed, malformed or foreign dashboard responses instead of returning zero", async () => {
  for (const response of [
    Response.json({}, { status: 503 }),
    Response.json({}),
    Response.json({
      ...academic,
      schoolId: "a1000000-0000-4000-8000-000000000002",
    }),
  ]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response))
    await expect(
      loadWorkspace(academicPrincipal, { includeAcademic: true })
    ).rejects.toThrow()
  }
})
it("does not call student projections when an Admin dashboard requests academic data", async () => {
  const totals = {
    students: 0,
    activeStudents: 0,
    enrolledStudents: 0,
    activeEnrollments: 0,
    withoutClass: 0,
    classes: 0,
  }
  const fetcher = vi.fn().mockResolvedValue(Response.json(totals))
  vi.stubGlobal("fetch", fetcher)
  expect(
    (await loadWorkspace(context, { includeAcademic: true })).studentSummary
  ).toEqual(totals)
  expect(fetcher).toHaveBeenCalledTimes(1)
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
