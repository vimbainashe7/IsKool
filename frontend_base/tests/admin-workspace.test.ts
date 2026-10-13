import { describe, expect, it } from "vitest"
import { createWorkspaceFixture } from "@/dev/workspace-fixture"
import { adminModel, schoolWeekday } from "@/features/admin-workspace/model"

describe("admin workspace projections", () => {
  it("does not infer a missing teacher when the membership is outside loaded records", () => {
    const w = createWorkspaceFixture()
    w.teachers = [
      { classId: "class-1", memberId: "outside-loaded-memberships" },
    ]
    expect(adminModel(w).unassignedClasses.map((c) => c.id)).toEqual([
      "class-2",
    ])
    expect(adminModel(w).teaching).toHaveLength(1)
  })
  it("counts distinct memberships and unique enrollment links", () => {
    const w = createWorkspaceFixture()
    w.members.push(w.members[0])
    w.enrollments.push(
      w.enrollments[0],
      { memberId: "missing", classId: "class-1" },
      { memberId: "student-1", classId: "missing" }
    )
    const m = adminModel(w)
    expect(m.students).toHaveLength(30)
    expect(m.enrolledStudents).toHaveLength(30)
    expect(m.enrollments).toHaveLength(60)
  })
  it("keeps suspended and invited students out of active enrollment metrics", () => {
    const w = createWorkspaceFixture()
    w.members[0].status = "suspended"
    w.members[1].status = "invited"
    const m = adminModel(w)
    expect(m.students).toHaveLength(30)
    expect(m.activeStudents).toHaveLength(28)
    expect(m.enrolledStudents).toHaveLength(28)
    expect(m.enrollments).toHaveLength(60)
  })
  it("detects classes missing an active teacher and unassigned students", () => {
    const w = createWorkspaceFixture()
    w.teachers = [{ classId: "class-1", memberId: "teacher-1" }]
    w.enrollments = w.enrollments.filter((e) => e.memberId !== "student-1")
    const m = adminModel(w)
    expect(m.unassignedClasses.map((c) => c.id)).toEqual(["class-2"])
    expect(m.studentsWithoutClass.map((s) => s.id)).toEqual(["student-1"])
  })
  it("distinguishes unavailable optional sources from honest empty data", () => {
    const w = createWorkspaceFixture()
    w.members = []
    w.timetable = []
    w.audit = []
    w.warnings = [
      "People could not be loaded.",
      "Your timetable is temporarily unavailable.",
      "Audit history is temporarily unavailable.",
    ]
    const m = adminModel(w)
    expect(m.peopleAvailable).toBe(false)
    expect(m.timetableAvailable).toBe(false)
    expect(m.auditAvailable).toBe(false)
    w.warnings = []
    expect(adminModel(w).peopleAvailable).toBe(true)
  })
  it("calculates weekday in school time across a UTC midnight boundary", () => {
    expect(schoolWeekday("2026-10-06T22:30:00Z")).toBe(3)
    const w = createWorkspaceFixture()
    w.asOf = "2026-10-06T22:30:00Z"
    w.timetable[0].weekday = 3
    expect(adminModel(w).today).toHaveLength(1)
  })
  it("counts overlapping room and shared teacher periods but excludes adjacent periods", () => {
    const w = createWorkspaceFixture()
    w.timetable = [
      {
        id: "a",
        classId: "class-1",
        weekday: 3,
        start: "08:00",
        end: "09:00",
        room: "Room 4",
      },
      {
        id: "b",
        classId: "class-2",
        weekday: 3,
        start: "08:30",
        end: "09:30",
        room: "room 4",
      },
      {
        id: "c",
        classId: "class-1",
        weekday: 3,
        start: "09:30",
        end: "10:30",
        room: "Room 4",
      },
    ]
    expect(adminModel(w).conflicts).toEqual([
      { first: "a", second: "b", type: "Room" },
      { first: "a", second: "b", type: "Teacher" },
    ])
  })
  it("preserves enrollment records when memberships are temporarily unavailable", () => {
    const w = createWorkspaceFixture()
    w.members = []
    w.warnings = ["People could not be loaded."]
    expect(adminModel(w).enrollments).toHaveLength(60)
  })
})
