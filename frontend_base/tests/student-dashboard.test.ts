import { describe, expect, it } from "vitest"
import { createWorkspaceFixture } from "@/dev/workspace-fixture"
import {
  studentDashboardModel,
  schoolDayKey,
  deadlineLabel,
} from "@/features/student-dashboard/model"
function student() {
  const w = createWorkspaceFixture()
  w.membershipId = "student-1"
  w.asOf = "2026-10-07T08:00:00Z"
  return w
}
describe("Student dashboard projections", () => {
  it("only shows actual enrolled classes and published work", () => {
    const w = student()
    w.enrollments = w.enrollments.filter((e) => e.classId === "class-1")
    const model = studentDashboardModel(w)
    expect(model.courses.map((c) => c.id)).toEqual(["class-1"])
    expect(model.assignments.map((a) => a.id)).toEqual(["assignment-1"])
    expect(model.submittedCount).toBe(0)
    expect(model.courses[0].teacher).toBe("Demo Teacher")
  })
  it("excludes own submitted work but never counts another learner's work", () => {
    const w = student()
    w.submissions.push({
      ...w.submissions[0],
      id: "own",
      studentId: "student-1",
    })
    expect(studentDashboardModel(w).pending.map((a) => a.id)).not.toContain(
      "assignment-1"
    )
    expect(studentDashboardModel(w).submittedCount).toBe(1)
  })
  it("returned work becomes actionable again", () => {
    const w = student()
    w.submissions.push({
      ...w.submissions[0],
      id: "own",
      studentId: "student-1",
      status: "returned",
    })
    expect(studentDashboardModel(w).pending.map((a) => a.id)).toContain(
      "assignment-1"
    )
    expect(studentDashboardModel(w).submittedCount).toBe(0)
  })
  it("sorts overdue, today and future tasks with undated work last", () => {
    const w = student()
    w.assignments[0].dueAt = "2026-10-08T08:00:00Z"
    w.assignments[1].dueAt = "2026-10-06T08:00:00Z"
    w.assignments.push(
      { ...w.assignments[0], id: "today", dueAt: "2026-10-07T12:00:00Z" },
      { ...w.assignments[0], id: "undated", dueAt: null }
    )
    expect(studentDashboardModel(w).pending.map((a) => a.id)).toEqual([
      "assignment-2",
      "today",
      "assignment-1",
      "undated",
    ])
    expect(studentDashboardModel(w).tasks.map((g) => g.label)).toEqual([
      "Overdue",
      "Today",
      "Coming up",
      "No deadline",
    ])
  })
  it("uses school dates across UTC midnight", () => {
    expect(schoolDayKey("2026-10-07T23:00:00Z")).toBe("2026-10-08")
    const w = student()
    w.assignments[0].dueAt = "2026-10-07T23:30:00Z"
    expect(deadlineLabel(w.assignments[0], "2026-10-07T22:00:00Z")).toBe(
      "Due today"
    )
  })
  it("shows only released own feedback and preserves zero scores", () => {
    const w = student()
    w.submissions.push({
      ...w.submissions[0],
      id: "own",
      studentId: "student-1",
    })
    w.grades = [
      {
        id: "grade-own",
        submissionId: "own",
        studentId: "student-1",
        score: 0,
        feedback: "Try again",
        publishedAt: w.asOf,
        version: 1,
      },
      {
        id: "private",
        submissionId: w.submissions[0].id,
        studentId: "student-2",
        score: 40,
        feedback: "Private",
        publishedAt: w.asOf,
        version: 1,
      },
    ]
    expect(studentDashboardModel(w).feedback).toHaveLength(1)
    expect(studentDashboardModel(w).feedback[0].score).toBe(0)
    w.grades[0].publishedAt = null
    expect(studentDashboardModel(w).feedback).toHaveLength(0)
  })
  it("handles a genuinely empty enrollment without fabricated cards or events", () => {
    const w = student()
    w.enrollments = []
    const model = studentDashboardModel(w)
    expect(model.courses).toEqual([])
    expect(model.assignments).toEqual([])
    expect(model.schedule).toEqual([])
    expect(model.resources).toEqual([])
  })
})
