import { describe, it, expect } from "vitest"
import {
  parseStudentDetail,
  parseStudentPage,
} from "@/features/assignments/student-contracts"
const id = "a9000000-0000-4000-8000-000000000001",
  other = "b9000000-0000-4000-8000-000000000001",
  date = "2026-10-22T12:00:00.000Z"
const policy = {
  maxAttempts: 3,
  lateAccepted: true,
  duplicateWindowSeconds: 30,
}
const assignment = {
  id,
  schoolId: id,
  classId: id,
  academicYearId: id,
  academicTermId: id,
  authorMembershipId: other,
  title: "Algebra",
  instructions: "Show working",
  totalMarks: 20,
  dueAt: date,
  status: "published",
  version: 2,
  publishedAt: date,
  createdAt: date,
  updatedAt: date,
}
const submission = {
  id,
  schoolId: id,
  assignmentId: id,
  studentId: id,
  studentMembershipId: id,
  text: "Answer",
  attempt: 1,
  status: "submitted",
  submittedAt: date,
}
describe("Student authoritative school work", () => {
  it("accepts a published Teacher assignment with only the current Student work", () => {
    expect(
      parseStudentDetail(
        { assignment, submissions: [submission], policy },
        id,
        id,
        id
      ).submissions
    ).toHaveLength(1)
  })
  it("rejects drafts, foreign school assignments, private work and wrong assignment associations", () => {
    for (const body of [
      {
        assignment: { ...assignment, status: "draft" },
        submissions: [],
        policy,
      },
      {
        assignment: { ...assignment, schoolId: other },
        submissions: [],
        policy,
      },
      {
        assignment,
        submissions: [{ ...submission, studentMembershipId: other }],
        policy,
      },
      {
        assignment,
        submissions: [{ ...submission, assignmentId: other }],
        policy,
      },
    ])
      expect(() => parseStudentDetail(body, id, id, id)).toThrow()
  })
  it("distinguishes a genuine empty feed from failures and duplicate rows", () => {
    const p = {
      schoolId: id,
      membershipId: id,
      policy,
      items: [],
      nextCursor: null,
    }
    expect(parseStudentPage(p, id, id).items).toEqual([])
    expect(() => parseStudentPage({ error: "unavailable" }, id, id)).toThrow()
    expect(() =>
      parseStudentPage(
        {
          ...p,
          items: [
            { ...assignment, latestSubmission: null },
            { ...assignment, latestSubmission: null },
          ],
        },
        id,
        id
      )
    ).toThrow()
  })
})
