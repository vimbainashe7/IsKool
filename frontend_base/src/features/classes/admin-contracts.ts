import { z } from "zod"
const id = z.string().uuid()
export const accountOptionsSchema = z.object({
  items: z.array(z.object({ id, displayName: z.string(), email: z.string() })),
  nextCursor: id.nullable(),
})
export const classOptionsSchema = z.object({
  items: z.array(
    z.object({ id, name: z.string(), academicYearLabel: z.string() })
  ),
  nextCursor: id.nullable(),
})
export const accountLinkSchema = z.object({
  studentId: id,
  membershipId: id.nullable(),
  version: z.number().int(),
})
export const accountDetailSchema = accountLinkSchema.extend({
  account: z
    .object({
      id,
      displayName: z.string().nullable(),
      email: z.string().nullable(),
      active: z.boolean(),
    })
    .nullable(),
})
export const teacherMutationSchema = z.object({
  classId: id,
  membershipId: id,
  status: z.enum(["active", "revoked"]),
  version: z.number().int(),
})
export const teacherListSchema = z.object({
  items: z.array(
    teacherMutationSchema.extend({
      displayName: z.string(),
      email: z.string(),
      accountActive: z.boolean(),
    })
  ),
  nextCursor: id.nullable(),
})
export type AccountDetail = z.infer<typeof accountDetailSchema>
export type TeacherLinks = z.infer<typeof teacherListSchema>
