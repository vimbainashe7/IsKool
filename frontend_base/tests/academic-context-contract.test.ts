import { expect, it } from "vitest"
import { parseClassContext } from "@/features/classes/contracts"
const school = "a1000000-0000-4000-8000-000000000001",
  member = "a3000000-0000-4000-8000-000000000004"
const context = {
  version: 1,
  schoolId: school,
  membershipId: member,
  role: "student",
  asOf: new Date().toISOString(),
  student: null,
  classes: [],
  totalClasses: 0,
  nextCursor: null,
}
it("accepts genuine empty class context and denies mismatched identities or invalid counts", () => {
  expect(
    parseClassContext(context, school, member, "student").totalClasses
  ).toBe(0)
  for (const changes of [
    { schoolId: "a1000000-0000-4000-8000-000000000002" },
    { membershipId: "a3000000-0000-4000-8000-000000000003" },
    { totalClasses: -1 },
    { classes: undefined },
    { role: "teacher" },
  ])
    expect(() =>
      parseClassContext({ ...context, ...changes }, school, member, "student")
    ).toThrow()
})
