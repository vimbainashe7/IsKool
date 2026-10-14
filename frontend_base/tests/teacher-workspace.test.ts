import { describe, it, expect } from "vitest"
import { createWorkspaceFixture } from "@/dev/workspace-fixture"
import { teacherModel } from "@/features/teacher-workspace/model"
function fixture() {
  const w = createWorkspaceFixture(30, { now: "2026-10-07T08:00:00Z" })
  w.membershipId = "teacher-1"
  return w
}
describe("Teacher workspace projections", () => {
  it.each([
    ["2026-10-06T21:59:59Z", 2],
    ["2026-10-06T22:00:00Z", 3],
    ["2026-10-06T23:59:59Z", 3],
    ["2026-10-07T00:00:00Z", 3],
    ["2026-10-10T22:00:00Z", 7],
  ])("aligns fixture and model weekdays at %s", (now, weekday) => {
    const w = createWorkspaceFixture(30, { now })
    expect(w.asOf).toBe(new Date(now).toISOString())
    expect(w.timetable[0].weekday).toBe(weekday)
    expect(teacherModel(w).weekday).toBe(weekday)
    expect(teacherModel(w).today).toHaveLength(1)
  })
  it("rejects an invalid fixture instant", () => {
    expect(() => createWorkspaceFixture(30, { now: "invalid" })).toThrow(
      "must be a valid instant"
    )
  })
  it("only projects classes assigned to the active teacher", () => {
    const w = fixture()
    w.teachers = w.teachers.filter((t) => t.classId === "class-1")
    const m = teacherModel(w)
    expect(m.classes.map((c) => c.id)).toEqual(["class-1"])
    expect(m.assignments.every((a) => a.classId === "class-1")).toBe(true)
    expect(m.materials.every((a) => a.classId === "class-1")).toBe(true)
  })
  it("uses unique enrolled learner/assignment pairs for progress", () => {
    const w = fixture()
    w.submissions.push({ ...w.submissions[0], id: "duplicate" })
    w.submissions.push({
      ...w.submissions[0],
      id: "outsider",
      studentId: "outsider",
    })
    const c = teacherModel(w).progress[0]
    expect(c.expected).toBe(30)
    expect(c.received).toBe(29)
    expect(c.percent).toBe(97)
  })
  it("excludes returned work and unpublished assignments from completion", () => {
    const w = fixture()
    w.submissions[0].status = "returned"
    expect(teacherModel(w).progress[0].received).toBe(28)
    w.assignments[0].status = "draft"
    expect(teacherModel(w).progress[0].percent).toBeNull()
  })
  it("keeps zero marks and excludes released reviews from attention", () => {
    const w = fixture()
    const s = w.submissions[0]
    w.grades.push({
      id: "grade",
      submissionId: s.id,
      studentId: s.studentId,
      score: 0,
      feedback: "",
      publishedAt: w.asOf,
      version: 1,
    })
    const m = teacherModel(w)
    expect(m.progress[0].marked).toBe(1)
    expect(m.awaiting).toHaveLength(28)
  })
  it("uses school-local weekday across UTC midnight and excludes elapsed lessons", () => {
    const w = fixture()
    expect(w.timetable[0].weekday).toBe(3)
    w.asOf = "2026-10-06T23:00:00Z"
    expect(teacherModel(w).weekday).toBe(3)
    expect(teacherModel(w).today).toHaveLength(1)
    w.asOf = "2026-10-07T10:00:00Z"
    expect(teacherModel(w).progress[0].next).toBeUndefined()
  })
  it("does not fabricate percentages or classes for unassigned teachers", () => {
    const w = fixture()
    w.teachers = []
    expect(teacherModel(w).progress).toEqual([])
    expect(teacherModel(w).today).toEqual([])
    expect(teacherModel(w).awaiting).toEqual([])
  })
})
