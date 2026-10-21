import "server-only"
import { z } from "zod"
import { cookies } from "next/headers"
import { randomUUID } from "node:crypto"
import { getIsKoolApiUrls, iskoolAuthCookies } from "@/lib/iskool-auth/shared"
import type { IsKoolContext } from "@/features/context/session-contract"
import { createClient } from "@/lib/supabase/server"
import { isIsKoolAuthConfigured } from "@/lib/iskool-auth/shared"
import { canUseDemoSession } from "@/dev/demo-session"
import { readDemoWorkspace } from "@/dev/workspace-store"
import { parseClassContext } from "@/features/classes/contracts"
import {
  studentSummarySchema,
  workspaceSchema,
  type Workspace,
} from "./contracts"
const dbId = z.string().uuid()
const classRow = z.object({
  id: dbId,
  name: z.string(),
  subject: z.string().nullable(),
  year_level: z.string().nullable(),
})
const linkRow = z.object({ class_id: dbId, membership_id: dbId })
const assignmentRow = z.object({
  id: dbId,
  class_id: dbId,
  title: z.string(),
  instructions: z.string().nullable(),
  due_at: z.string().nullable(),
  status: z.enum(["draft", "published", "archived"]),
})
const submissionRow = z.object({
  id: dbId,
  assignment_id: dbId,
  student_membership_id: dbId,
  original_filename: z.string(),
  submitted_at: z.string(),
  storage_path: z.string(),
  status: z.enum(["submitted", "returned", "graded"]),
})
const gradeRow = z.object({
  id: dbId,
  submission_id: dbId,
  student_membership_id: dbId,
  score: z.coerce.number().nullable(),
  feedback: z.string().nullable(),
  published_at: z.string().nullable(),
})
const materialRow = z.object({
  id: dbId,
  class_id: dbId,
  title: z.string(),
  original_filename: z.string(),
  storage_path: z.string(),
  published_at: z.string().nullable(),
})
// These are validated read projections, not a duplicate database model. Generated DB types are absent.
export async function loadWorkspace(
  context: IsKoolContext,
  options: { includeAcademic?: boolean } = {}
): Promise<Workspace> {
  if (canUseDemoSession()) return readDemoWorkspace(context)
  const client = await createClient()
  if (!context.membershipId)
    throw new Error("Your school workspace is not available.")
  if (isIsKoolAuthConfigured()) {
    let academicContext = null
    if (
      options.includeAcademic &&
      (context.activeRole === "student" || context.activeRole === "teacher")
    ) {
      const token = (await cookies()).get(iskoolAuthCookies.apsAccess)?.value
      if (!token) throw new Error("No academic session")
      const url = `${getIsKoolApiUrls().aps}/academic-context?role=${context.activeRole}&limit=3`
      const requestOptions = {
        cache: "no-store" as const,
        signal: AbortSignal.timeout(
          process.env.NODE_ENV === "development" ? 30_000 : 10_000
        ),
        headers: {
          authorization: `Bearer ${token}`,
          "x-request-id": randomUUID(),
        },
      }
      let response = await fetch(url, requestOptions)
      // Retry only a failed idempotent read, sharing the original deadline.
      // Authorization failures and malformed successful responses are never retried.
      if (response.status >= 500 && !requestOptions.signal.aborted)
        response = await fetch(url, requestOptions)
      if (!response.ok)
        throw new Error("Your classes could not be loaded. Please retry.")
      academicContext = parseClassContext(
        await response.json(),
        context.school.id,
        context.membershipId,
        context.activeRole
      )
    }
    let studentSummary = null
    if (context.activeRole === "admin") {
      try {
        const token = (await cookies()).get(iskoolAuthCookies.samsAccess)?.value
        if (!token) throw new Error("No SAMS session")
        const response = await fetch(
          `${getIsKoolApiUrls().sams}/student-administration/summary`,
          {
            cache: "no-store",
            signal: AbortSignal.timeout(
              process.env.NODE_ENV === "development" ? 30_000 : 10_000
            ),
            headers: {
              authorization: `Bearer ${token}`,
              "x-request-id": randomUUID(),
            },
          }
        )
        if (!response.ok) throw new Error("School summary unavailable")
        studentSummary = studentSummarySchema.parse(await response.json())
      } catch {
        /* The UI renders unavailable, never fabricated zero totals. */
      }
    }
    return workspaceSchema.parse({
      academicContext,
      studentSummary,
      asOf: new Date().toISOString(),
      mode: "live",
      userId: context.user.id,
      membershipId: context.membershipId,
      schoolId: context.school.id,
      classes: [],
      assignments: [],
      submissions: [],
      grades: [],
      materials: [],
      members: [],
      enrollments: [],
      teachers: [],
      timetable: [],
      notifications: [],
      jobs: [],
      drafts: [],
      audit: [],
      warnings: [
        ...(context.activeRole === "admin" && !studentSummary
          ? [
              "Student and enrollment totals could not be loaded. Retry loading records.",
            ]
          : []),
        "Assignments, grades, timetable and broader staff/account administration are not available yet.",
      ],
    })
  }
  if (!client) throw new Error("Your school workspace is not available.")
  const role = context.activeRole
  const school = context.school.id
  const membership = context.membershipId
  const [enrollmentResult, teacherResult] = await Promise.all([
    client
      .from("class_enrollments")
      .select("class_id,membership_id")
      .limit(1000),
    client.from("class_teachers").select("class_id,membership_id").limit(1000),
  ])
  if (enrollmentResult.error || teacherResult.error)
    throw new Error("Your classes could not be loaded.")
  let enrollments = z.array(linkRow).parse(enrollmentResult.data)
  let teachers = z.array(linkRow).parse(teacherResult.data)
  const scoped =
    role === "student"
      ? enrollments
          .filter((e) => e.membership_id === membership)
          .map((e) => e.class_id)
      : teachers
          .filter((t) => t.membership_id === membership)
          .map((t) => t.class_id)
  let classesQuery = client
    .from("classes")
    .select("id,name,subject,year_level")
    .eq("school_id", school)
    .order("name")
    .limit(100)
  if (role !== "admin") classesQuery = classesQuery.in("id", scoped)
  const classesResult = await classesQuery
  if (classesResult.error) throw new Error("Your classes could not be loaded.")
  const classes = z
    .array(classRow)
    .parse(classesResult.data)
    .map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject ?? "",
      yearLevel: c.year_level ?? "",
    }))
  const classIds = classes.map((c) => c.id)
  enrollments = enrollments.filter(
    (e) =>
      classIds.includes(e.class_id) &&
      (role !== "student" || e.membership_id === membership)
  )
  teachers = teachers.filter((t) => classIds.includes(t.class_id))
  let aq = client
    .from("assignments")
    .select("id,class_id,title,instructions,due_at,status")
    .eq("school_id", school)
    .in("class_id", classIds)
    .order("due_at")
    .limit(100)
  if (role === "student") aq = aq.eq("status", "published")
  const ar = await aq
  if (ar.error) throw new Error("Assignments could not be loaded.")
  const assignments = z
    .array(assignmentRow)
    .parse(ar.data)
    .map((a) => ({
      id: a.id,
      classId: a.class_id,
      title: a.title,
      instructions: a.instructions ?? "",
      dueAt: a.due_at,
      totalMarks: null,
      latePolicy: "unknown" as const,
      resubmission: false,
      status: a.status,
      attachment: "",
      attachmentPath: "",
    }))
  let sq = client
    .from("submissions")
    .select(
      "id,assignment_id,student_membership_id,original_filename,submitted_at,storage_path,status"
    )
    .eq("school_id", school)
    .in(
      "assignment_id",
      assignments.map((a) => a.id)
    )
    .limit(100)
  if (role === "student") sq = sq.eq("student_membership_id", membership)
  let mq = client
    .from("materials")
    .select("id,class_id,title,original_filename,storage_path,published_at")
    .eq("school_id", school)
    .in("class_id", classIds)
    .limit(100)
  if (role === "student") mq = mq.not("published_at", "is", null)
  const [sr, mr] = await Promise.all([sq, mq])
  if (sr.error || mr.error) throw new Error("Class work could not be loaded.")
  const submissions = z
    .array(submissionRow)
    .parse(sr.data)
    .map((s) => ({
      id: s.id,
      assignmentId: s.assignment_id,
      studentId: s.student_membership_id,
      filename: s.original_filename,
      submittedAt: s.submitted_at,
      filePath: s.storage_path,
      status: s.status,
    }))
  let gq = client
    .from("grades")
    .select(
      "id,submission_id,student_membership_id,score,feedback,published_at"
    )
    .eq("school_id", school)
    .in(
      "submission_id",
      submissions.map((s) => s.id)
    )
    .limit(100)
  if (role === "student")
    gq = gq
      .eq("student_membership_id", membership)
      .not("published_at", "is", null)
  const gr = await gq
  if (gr.error) throw new Error("Grades could not be loaded.")
  const warnings = [
    "Uploads, publishing and changes are unavailable while school services are being connected.",
  ]
  const w: Workspace = {
    asOf: new Date().toISOString(),
    mode: "live",
    userId: context.user.id,
    membershipId: membership,
    schoolId: school,
    classes,
    assignments,
    submissions,
    grades: z
      .array(gradeRow)
      .parse(gr.data)
      .map((g) => ({
        id: g.id,
        submissionId: g.submission_id,
        studentId: g.student_membership_id,
        score: g.score,
        feedback: g.feedback ?? "",
        publishedAt: g.published_at,
        version: 0,
      })),
    materials: z
      .array(materialRow)
      .parse(mr.data)
      .map((m) => ({
        id: m.id,
        classId: m.class_id,
        title: m.title,
        topic: "",
        filename: m.original_filename,
        filePath: m.storage_path,
        status: m.published_at ? "published" : "draft",
      })),
    members: [],
    enrollments: enrollments.map((e) => ({
      classId: e.class_id,
      memberId: e.membership_id,
    })),
    teachers: teachers.map((t) => ({
      classId: t.class_id,
      memberId: t.membership_id,
    })),
    timetable: [],
    notifications: [],
    jobs: [],
    drafts: [],
    audit: [],
    warnings,
  }
  // Optional automation projections may not be deployed; distinguish unavailable from empty.
  const [tt, nr] = await Promise.all([
    client
      .from("timetable_slots")
      .select("id,class_id,weekday,starts_at,ends_at,room")
      .eq("school_id", school)
      .in("class_id", classIds)
      .limit(100),
    client
      .from("notification_events")
      .select("id,title,body,deep_link")
      .eq("school_id", school)
      .eq("recipient_membership_id", membership)
      .limit(100),
  ])
  if (tt.error) warnings.push("Your timetable is temporarily unavailable.")
  else
    w.timetable = z
      .array(
        z.object({
          id: dbId,
          class_id: dbId,
          weekday: z.number(),
          starts_at: z.string(),
          ends_at: z.string(),
          room: z.string().nullable(),
        })
      )
      .parse(tt.data)
      .map((t) => ({
        id: t.id,
        classId: t.class_id,
        weekday: t.weekday,
        start: t.starts_at,
        end: t.ends_at,
        room: t.room ?? "",
      }))
  if (nr.error) warnings.push("Notifications are temporarily unavailable.")
  else
    w.notifications = z
      .array(
        z.object({
          id: dbId,
          title: z.string(),
          body: z.string(),
          deep_link: z.string().nullable(),
        })
      )
      .parse(nr.data)
      .map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.deep_link ?? "/home",
      }))
  if (role !== "student") {
    const memberIds =
      role === "admin"
        ? null
        : [membership, ...enrollments.map((e) => e.membership_id)]
    let q = client
      .from("school_memberships")
      .select("id,status,membership_roles(role_key)")
      .eq("school_id", school)
      .limit(100)
    if (memberIds) q = q.in("id", memberIds)
    const result = await q
    if (result.error) warnings.push("People could not be loaded.")
    else
      w.members = z
        .array(
          z.object({
            id: dbId,
            status: z.enum(["active", "invited", "suspended"]),
            membership_roles: z.array(
              z.object({ role_key: z.enum(["student", "teacher", "admin"]) })
            ),
          })
        )
        .parse(result.data)
        .map((m) => ({
          id: m.id,
          name: `Member ${m.id.slice(0, 8)}`,
          status: m.status,
          roles: m.membership_roles.map((r) => r.role_key),
        }))
  }
  if (role === "admin") {
    const result = await client
      .from("audit_logs")
      .select("id,action,created_at")
      .eq("school_id", school)
      .order("created_at", { ascending: false })
      .limit(100)
    if (result.error) warnings.push("Audit history is temporarily unavailable.")
    else
      w.audit = z
        .array(
          z.object({
            id: z.coerce.string(),
            action: z.string(),
            created_at: z.string(),
          })
        )
        .parse(result.data)
        .map((a) => ({
          id: a.id,
          action: a.action,
          at: a.created_at,
          actor: "School service",
        }))
  }
  return workspaceSchema.parse(w)
}
