import { describe, expect, it } from "vitest"
import {
  draftSchema,
  parseAssignment,
  parseAssignmentPage,
} from "@/features/assignments/live-contracts"
const id = "a9000000-0000-4000-8000-000000000001"
const row = {
  id,
  schoolId: id,
  classId: id,
  academicYearId: id,
  academicTermId: id,
  authorMembershipId: id,
  title: "Algebra",
  instructions: "Show working",
  totalMarks: 20,
  dueAt: "2026-11-01T12:00:00.000Z",
  status: "draft",
  version: 1,
  publishedAt: null,
  createdAt: "2026-10-21T12:00:00.000Z",
  updatedAt: "2026-10-21T12:00:00.000Z",
}
describe("authoritative Teacher assignment contracts", () => {
  it("rejects blank text, invalid marks and invalid dates", () => {
    const input = {
      title: row.title,
      instructions: row.instructions,
      totalMarks: 20,
      dueAt: row.dueAt,
    }
    expect(draftSchema.safeParse(input).success).toBe(true)
    for (const change of [
      { title: " " },
      { totalMarks: 20.123 },
      { totalMarks: 0 },
      { dueAt: "tomorrow" },
    ])
      expect(draftSchema.safeParse({ ...input, ...change }).success).toBe(false)
  })
  it("accepts only the current author and school", () => {
    expect(parseAssignment(row, id, id).id).toBe(id)
    expect(() =>
      parseAssignment(
        { ...row, schoolId: "b9000000-0000-4000-8000-000000000001" },
        id,
        id
      )
    ).toThrow()
    expect(() =>
      parseAssignment(
        { ...row, authorMembershipId: "b9000000-0000-4000-8000-000000000001" },
        id,
        id
      )
    ).toThrow()
  })
  it("distinguishes a real empty page from a failed or malformed response", () => {
    expect(
      parseAssignmentPage(
        {
          schoolId: id,
          membershipId: id,
          items: [],
          summary: { draft: 0, published: 0, archived: 0 },
          nextCursor: null,
        },
        id,
        id
      ).items
    ).toEqual([])
    expect(() =>
      parseAssignmentPage({ error: "Unavailable" }, id, id)
    ).toThrow()
    expect(() =>
      parseAssignmentPage(
        {
          schoolId: id,
          membershipId: id,
          items: [row],
          summary: { draft: -1, published: 0, archived: 0 },
          nextCursor: null,
        },
        id,
        id
      )
    ).toThrow()
  })
})
