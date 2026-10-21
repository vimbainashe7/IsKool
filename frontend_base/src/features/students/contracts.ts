import { z } from "zod"
const id = z.string().uuid()
export const studentSchema = z.object({
  id,
  schoolId: id,
  admissionNumber: z.string(),
  givenName: z.string(),
  familyName: z.string(),
  status: z.enum(["active", "archived"]),
  version: z.number().int(),
})
export const guardianSchema = z.object({
  id,
  schoolId: id,
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
})
export const yearSchema = z.object({
  id,
  schoolId: id,
  label: z.string(),
  startsOn: z.string(),
  endsOn: z.string(),
})
export const termSchema = yearSchema.extend({ academicYearId: id })
export const classSchema = z.object({
  id,
  schoolId: id,
  academicYearId: id,
  name: z.string(),
})
export const enrollmentSchema = z.object({
  id,
  studentId: id,
  schoolId: id,
  classId: id,
  academicYearId: id,
  academicTermId: id,
  status: z.enum([
    "pending",
    "active",
    "withdrawn",
    "transferred",
    "completed",
    "cancelled",
  ]),
  version: z.number().int(),
  enrolledAt: z.string(),
  endedAt: z.string().nullable(),
})
export const studentDetailSchema = studentSchema.extend({
  guardians: z.array(
    z.object({
      guardianId: id,
      relationship: z.string(),
      guardian: guardianSchema,
    })
  ),
  enrollments: z.array(
    enrollmentSchema.extend({ schoolClass: classSchema, term: termSchema })
  ),
})
export const studentListSchema = z.object({
  items: z.array(studentSchema),
  nextCursor: id.nullable(),
})
export const guardianListSchema = z.object({
  items: z.array(guardianSchema),
  nextCursor: id.nullable(),
})
export const referenceSchema = z.object({
  years: z.array(yearSchema),
  terms: z.array(termSchema),
  classes: z.array(classSchema),
  truncated: z.boolean(),
})
export type Student = z.infer<typeof studentSchema>
export type StudentDetail = z.infer<typeof studentDetailSchema>
export type References = z.infer<typeof referenceSchema>
export type Guardian = z.infer<typeof guardianSchema>

export async function studentRequest<S extends z.ZodType>(
  path: string,
  schema: S,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal
): Promise<z.infer<S>> {
  const response = await fetch(`/api/sams/${path}`, {
    method,
    cache: "no-store",
    signal,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : "School records could not be loaded. Try again."
    )
  const parsed = schema.safeParse(result)
  if (!parsed.success)
    throw new Error(
      "School records returned an unexpected response. Try again or contact support."
    )
  return parsed.data
}
