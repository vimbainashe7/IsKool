import { z } from "zod"
const id = z.string().uuid()
export const draftSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(160),
  instructions: z.string().trim().min(1, "Enter instructions").max(10000),
  totalMarks: z
    .number()
    .min(0.01)
    .max(1000)
    .refine(
      (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
      "Use at most two decimal places"
    ),
  dueAt: z.iso.datetime({ offset: true }),
})
export const assignmentSchema = draftSchema.extend({
  id,
  schoolId: id,
  classId: id,
  academicYearId: id,
  academicTermId: id,
  authorMembershipId: id,
  status: z.enum(["draft", "published", "archived"]),
  version: z.number().int().positive(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})
export type LiveAssignment = z.infer<typeof assignmentSchema>
const pageSchema = z.object({
  schoolId: id,
  membershipId: id,
  items: z.array(assignmentSchema).max(50),
  summary: z.object({
    draft: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
    archived: z.number().int().nonnegative(),
  }),
  nextCursor: id.nullable(),
})
export function parseAssignment(
  body: unknown,
  schoolId: string,
  membershipId: string
) {
  const row = assignmentSchema.parse(body)
  if (
    row.schoolId !== schoolId ||
    row.authorMembershipId !== membershipId ||
    (row.status === "published" && !row.publishedAt)
  )
    throw new Error(
      "Assignment ownership could not be verified. Reload your workspace."
    )
  return row
}
export function parseAssignmentPage(
  body: unknown,
  schoolId: string,
  membershipId: string
) {
  const page = pageSchema.parse(body)
  if (
    page.schoolId !== schoolId ||
    page.membershipId !== membershipId ||
    new Set(page.items.map((r) => r.id)).size !== page.items.length
  )
    throw new Error("Assignment list could not be verified.")
  page.items.forEach((row) => parseAssignment(row, schoolId, membershipId))
  return page
}
export async function assignmentRequest(
  path: string,
  method = "GET",
  input?: unknown,
  signal?: AbortSignal
) {
  const response = await fetch(`/api/assignments${path}`, {
    method,
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(45000),
    headers: input ? { "content-type": "application/json" } : undefined,
    body: input ? JSON.stringify(input) : undefined,
  })
  const body = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : "Assignments could not be loaded. Please retry."
    )
  return body as unknown
}
