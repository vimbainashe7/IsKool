import { z } from "zod"
export const id = z.string().min(1).max(100)
export const classSchema = z.object({
  id,
  name: z.string(),
  subject: z.string().default(""),
  yearLevel: z.string().default(""),
})
export const assignmentSchema = z.object({
  id,
  classId: id,
  title: z.string(),
  instructions: z.string(),
  totalMarks: z.number().positive().nullable(),
  dueAt: z.string().nullable(),
  latePolicy: z.enum(["allow", "deny", "unknown"]),
  resubmission: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
  attachment: z.string().default(""),
  attachmentPath: z.string().default(""),
})
export const submissionSchema = z.object({
  id,
  assignmentId: id,
  studentId: id,
  filename: z.string(),
  submittedAt: z.string(),
  status: z.enum(["submitted", "returned", "graded"]),
  filePath: z.string(),
})
export const gradeSchema = z.object({
  id,
  submissionId: id,
  studentId: id,
  score: z.number().nullable(),
  feedback: z.string(),
  publishedAt: z.string().nullable(),
  version: z.number().int().default(0),
})
export const materialSchema = z.object({
  id,
  classId: id,
  title: z.string(),
  topic: z.string(),
  filename: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  filePath: z.string(),
})
export const memberSchema = z.object({
  id,
  name: z.string(),
  status: z.enum(["active", "invited", "suspended"]),
  roles: z.array(z.enum(["student", "teacher", "admin"])),
})
export const questionSchema = z.object({
  id,
  text: z.string(),
  marks: z.number().positive(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  answer: z.string(),
})
export const jobSchema = z.object({
  id,
  classId: id,
  tool: z.enum(["compile-notes", "create-test", "create-assignment"]),
  topic: z.string(),
  instructions: z.string(),
  sourceIds: z.array(id),
  status: z.enum(["queued", "processing", "completed", "failed", "canceled"]),
  createdAt: z.string(),
  error: z.string().default(""),
})
export const draftSchema = z.object({
  id,
  jobId: id,
  classId: id,
  title: z.string(),
  body: z.string(),
  questions: z.array(questionSchema),
  status: z.enum(["draft", "reviewed", "published", "archived"]),
  sourceIds: z.array(id),
})
export const workspaceSchema = z.object({
  asOf: z.string(),
  mode: z.enum(["demo", "live"]),
  userId: id,
  membershipId: id,
  schoolId: id,
  classes: z.array(classSchema),
  assignments: z.array(assignmentSchema),
  submissions: z.array(submissionSchema),
  grades: z.array(gradeSchema),
  materials: z.array(materialSchema),
  members: z.array(memberSchema),
  enrollments: z.array(z.object({ classId: id, memberId: id })),
  teachers: z.array(z.object({ classId: id, memberId: id })),
  timetable: z.array(
    z.object({
      id,
      classId: id,
      weekday: z.number(),
      start: z.string(),
      end: z.string(),
      room: z.string(),
    })
  ),
  notifications: z.array(
    z.object({ id, title: z.string(), body: z.string(), href: z.string() })
  ),
  jobs: z.array(jobSchema),
  drafts: z.array(draftSchema),
  audit: z.array(
    z.object({ id, action: z.string(), actor: z.string(), at: z.string() })
  ),
  warnings: z.array(z.string()).default([]),
})
export type Workspace = z.infer<typeof workspaceSchema>
export type Assignment = z.infer<typeof assignmentSchema>
export type Grade = z.infer<typeof gradeSchema>
export type AiDraft = z.infer<typeof draftSchema>
export const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assignment.save"),
    id: id.optional(),
    classId: id,
    title: z.string().trim().min(3).max(160),
    instructions: z.string().trim().min(10).max(20000),
    totalMarks: z.number().positive().max(1000),
    dueAt: z.string().datetime(),
    latePolicy: z.enum(["allow", "deny"]),
    resubmission: z.boolean(),
    status: z.enum(["draft", "published"]),
    attachment: z.string().max(255).default(""),
    attachmentPath: z.string().max(500).default(""),
  }),
  z.object({
    action: z.literal("submission.finalize"),
    assignmentId: id,
    filename: z.string().min(1).max(255),
    filePath: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal("material.save"),
    id: id.optional(),
    classId: id,
    title: z.string().trim().min(3).max(160),
    topic: z.string().trim().min(2).max(160),
    filename: z.string().min(1).max(255),
    filePath: z.string().min(1).max(500),
    status: z.enum(["draft", "published", "archived"]),
  }),
  z.object({
    action: z.literal("grades.save"),
    entries: z
      .array(
        z.object({
          submissionId: id,
          score: z.number().min(0).max(1000).nullable(),
          feedback: z.string().max(5000),
          publish: z.boolean(),
          version: z.number().int().min(0),
        })
      )
      .min(1)
      .max(100),
  }),
  z.object({
    action: z.literal("member.update"),
    memberId: id,
    status: z.enum(["active", "invited", "suspended"]),
    roles: z.array(z.enum(["student", "teacher", "admin"])).min(1),
  }),
  z.object({
    action: z.literal("member.invite"),
    email: z.string().email(),
    name: z.string().trim().min(2).max(160),
    role: z.enum(["student", "teacher", "admin"]),
  }),
  z.object({
    action: z.literal("class.save"),
    name: z.string().trim().min(2).max(160),
    subject: z.string().max(160),
    yearLevel: z.string().max(80),
  }),
  z.object({ action: z.literal("enrollment.save"), memberId: id, classId: id }),
  z.object({ action: z.literal("teacher.assign"), memberId: id, classId: id }),
  z.object({
    action: z.literal("ai.create"),
    classId: id,
    tool: jobSchema.shape.tool,
    topic: z.string().trim().min(3).max(160),
    instructions: z.string().trim().min(10).max(20000),
    sourceIds: z.array(id),
    questionCount: z.number().int().min(1).max(30),
    totalMarks: z.number().positive().max(1000),
    difficulty: z.enum(["easy", "medium", "hard"]),
    questionTypes: z
      .array(
        z.enum([
          "multiple choice",
          "short answer",
          "structured",
          "true/false",
          "essay",
          "problem solving",
        ])
      )
      .min(1),
    detail: z.enum(["brief", "standard", "detailed"]),
  }),
  z.object({ action: z.literal("ai.cancel"), jobId: id }),
  z.object({ action: z.literal("ai.retry"), jobId: id }),
  z.object({
    action: z.literal("draft.save"),
    id,
    title: z.string().trim().min(3).max(160),
    body: z.string().max(50000),
    questions: z.array(questionSchema).max(30),
    status: z.enum(["draft", "reviewed", "published", "archived"]),
  }),
  z.object({ action: z.literal("draft.convert"), id }),
])
export type Mutation = z.infer<typeof mutationSchema>
export type MutationResult = {
  message: string
  confirmedAt?: string
  id?: string
}
export const actionCapabilities = {
  "assignment.save": "assignments.manage",
  "submission.finalize": "assignments.submit",
  "material.save": "materials.manage",
  "grades.save": "grades.manage",
  "member.update": "roles.manage",
  "member.invite": "users.manage",
  "class.save": "classes.manage",
  "enrollment.save": "enrollments.manage",
  "teacher.assign": "classes.manage",
  "ai.create": "ai.use",
  "ai.cancel": "ai.use",
  "ai.retry": "ai.use",
  "draft.save": "ai.use",
  "draft.convert": "assignments.manage",
} as const
