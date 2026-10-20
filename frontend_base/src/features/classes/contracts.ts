import { z } from "zod"
const id = z.string().uuid()
const period = z.object({
  id,
  label: z.string().min(1).max(80),
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
})
export const authorizedClassSchema = z.object({
  id,
  name: z.string().min(1).max(100),
  academicYear: period,
  terms: z.array(period).max(100),
  studentCount: z.number().int().nonnegative().nullable(),
})
export const classContextSchema = z.object({
  version: z.literal(1),
  schoolId: id,
  membershipId: id,
  role: z.enum(["student", "teacher"]),
  asOf: z.iso.datetime({ offset: true }),
  student: z
    .object({
      id,
      schoolId: id,
      admissionNumber: z.string(),
      givenName: z.string(),
      familyName: z.string(),
    })
    .nullable(),
  classes: z.array(authorizedClassSchema).max(100),
  totalClasses: z.number().int().nonnegative(),
  nextCursor: id.nullable(),
})
export type ClassContext = z.infer<typeof classContextSchema>
export function parseClassContext(
  value: unknown,
  schoolId: string,
  membershipId: string,
  role: "student" | "teacher"
) {
  const result = classContextSchema.parse(value)
  if (
    result.schoolId !== schoolId ||
    result.membershipId !== membershipId ||
    result.role !== role ||
    (result.student && result.student.schoolId !== schoolId) ||
    result.classes.length > result.totalClasses ||
    new Set(result.classes.map((c) => c.id)).size !== result.classes.length
  )
    throw new Error("Class context could not be verified. Please retry.")
  return result
}
