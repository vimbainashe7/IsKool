import { z } from "zod"
import { assignmentSchema } from "./live-contracts"
const id = z.string().uuid()
export const submissionSchema = z.object({
  id,
  assignmentId: id,
  schoolId: id,
  studentId: id,
  studentMembershipId: id,
  text: z.string().trim().min(1).max(10000),
  attempt: z.number().int().min(1).max(3),
  status: z.enum(["submitted", "late"]),
  submittedAt: z.iso.datetime({ offset: true }),
})
const policySchema = z.object({
  maxAttempts: z.literal(3),
  lateAccepted: z.literal(true),
  duplicateWindowSeconds: z.literal(30),
})
const published = assignmentSchema.extend({
  status: z.literal("published"),
  publishedAt: z.iso.datetime({ offset: true }),
})
export const studentPageSchema = z.object({
  schoolId: id,
  membershipId: id,
  policy: policySchema,
  items: z
    .array(published.extend({ latestSubmission: submissionSchema.nullable() }))
    .max(50),
  nextCursor: id.nullable(),
})
export const studentDetailSchema = z.object({
  assignment: published,
  submissions: z.array(submissionSchema).max(3),
  policy: policySchema,
})
export type StudentDetail = z.infer<typeof studentDetailSchema>
export function verifySubmission(
  s: z.infer<typeof submissionSchema>,
  schoolId: string,
  membershipId: string,
  assignmentId: string
) {
  if (
    s.schoolId !== schoolId ||
    s.studentMembershipId !== membershipId ||
    s.assignmentId !== assignmentId
  )
    throw Error("Submission ownership could not be verified.")
  return s
}
export function parseStudentPage(
  body: unknown,
  schoolId: string,
  membershipId: string
) {
  const p = studentPageSchema.parse(body)
  if (
    p.schoolId !== schoolId ||
    p.membershipId !== membershipId ||
    new Set(p.items.map((x) => x.id)).size !== p.items.length
  )
    throw Error("Assignment list could not be verified.")
  for (const a of p.items) {
    if (a.schoolId !== schoolId)
      throw Error("Assignment school could not be verified.")
    if (a.latestSubmission)
      verifySubmission(a.latestSubmission, schoolId, membershipId, a.id)
  }
  return p
}
export function parseStudentDetail(
  body: unknown,
  schoolId: string,
  membershipId: string,
  assignmentId: string
) {
  const p = studentDetailSchema.parse(body)
  if (p.assignment.schoolId !== schoolId || p.assignment.id !== assignmentId)
    throw Error("Assignment context could not be verified.")
  p.submissions.forEach((s) =>
    verifySubmission(s, schoolId, membershipId, assignmentId)
  )
  if (
    new Set(p.submissions.map((s) => s.attempt)).size !== p.submissions.length
  )
    throw Error("Submission history could not be verified.")
  return p
}
export async function studentRequest(
  path: string,
  method = "GET",
  input?: unknown,
  signal?: AbortSignal
) {
  const r = await fetch(`/api/student-work${path}`, {
    method,
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(45000),
    headers: input ? { "content-type": "application/json" } : undefined,
    body: input ? JSON.stringify(input) : undefined,
  })
  const body = await r.json().catch(() => null)
  if (!r.ok)
    throw Error(
      typeof body?.error === "string"
        ? body.error
        : "School work is temporarily unavailable. Please retry."
    )
  return body as unknown
}
