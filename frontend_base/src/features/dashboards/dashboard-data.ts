import type { IsKoolContext } from "@/features/context/session-contract"
import { createClient } from "@/lib/supabase/server"

export type DashboardSource = "supabase" | "fixture"

export type StudentDashboardData = {
  source: DashboardSource
  todayClasses: string[]
  dueSoon: string[]
  overdue: string[]
  recentlyGraded: string[]
  feedback: string[]
  announcements: string[]
  timetable: string[]
  resources: string[]
}

export type TeacherDashboardData = {
  source: DashboardSource
  classes: string[]
  materialActions: string[]
  assignmentActions: string[]
  submissions: string[]
  grading: string[]
  aiTools: string[]
}

export type AdminDashboardData = {
  source: DashboardSource
  users: string[]
  memberships: string[]
  classes: string[]
  enrollments: string[]
  audit: string[]
}

const studentFixture: StudentDashboardData = {
  source: "fixture",
  todayClasses: ["Mathematics 4A - 08:00", "English Language - 10:20"],
  dueSoon: ["Algebra worksheet due tomorrow", "Biology diagram due Friday"],
  overdue: ["History reflection needs submission"],
  recentlyGraded: ["English comprehension: 82%"],
  feedback: ["Revise simultaneous equations before the next exercise."],
  announcements: ["Assembly starts at 07:30 tomorrow."],
  timetable: ["Period 1 Mathematics", "Period 2 English", "Period 3 Biology"],
  resources: ["Algebra examples PDF", "Biology cell structure notes"],
}

const teacherFixture: TeacherDashboardData = {
  source: "fixture",
  classes: ["Mathematics 4A", "Mathematics 4B"],
  materialActions: ["Upload lesson notes", "Publish worked example"],
  assignmentActions: ["Create assignment", "Schedule due date"],
  submissions: ["12 submissions need review", "3 late submissions flagged"],
  grading: ["Gradebook foundation ready for backend contract"],
  aiTools: ["Compile Notes", "Create Test", "Create Assignment"],
}

const adminFixture: AdminDashboardData = {
  source: "fixture",
  users: ["Provision pending staff accounts", "Review unassigned profiles"],
  memberships: ["Assign student, teacher, or admin roles"],
  classes: ["Create class", "Attach teachers"],
  enrollments: ["Enroll students into classes", "Review duplicates"],
  audit: ["Role changes and publishing events will be written to audit_logs"],
}

export async function getStudentDashboardData(context: IsKoolContext): Promise<StudentDashboardData> {
  const supabase = await createClient()
  if (!supabase) return studentFixture

  const [classes, assignments, grades, materials] = await Promise.all([
    supabase.from("classes").select("name").eq("school_id", context.school.id).limit(5),
    supabase.from("assignments").select("title, due_at").eq("school_id", context.school.id).limit(8),
    supabase.from("grades").select("score, feedback").eq("school_id", context.school.id).limit(5),
    supabase.from("materials").select("title").eq("school_id", context.school.id).limit(5),
  ])

  if (classes.error || assignments.error || grades.error || materials.error) {
    return studentFixture
  }

  return {
    source: "supabase",
    todayClasses: (classes.data ?? []).map((item) => String(item.name)),
    dueSoon: (assignments.data ?? []).map((item) => String(item.title)),
    overdue: [],
    recentlyGraded: (grades.data ?? []).map((item) => `Score ${item.score ?? "pending"}`),
    feedback: (grades.data ?? []).map((item) => String(item.feedback ?? "No feedback yet")).slice(0, 3),
    announcements: [],
    timetable: (classes.data ?? []).map((item) => String(item.name)),
    resources: (materials.data ?? []).map((item) => String(item.title)),
  }
}

export async function getTeacherDashboardData(context: IsKoolContext): Promise<TeacherDashboardData> {
  const supabase = await createClient()
  if (!supabase) return teacherFixture

  const [classes, assignments, submissions] = await Promise.all([
    supabase.from("classes").select("name").eq("school_id", context.school.id).limit(8),
    supabase.from("assignments").select("title").eq("school_id", context.school.id).limit(5),
    supabase.from("submissions").select("status").eq("school_id", context.school.id).limit(10),
  ])

  if (classes.error || assignments.error || submissions.error) {
    return teacherFixture
  }

  return {
    source: "supabase",
    classes: (classes.data ?? []).map((item) => String(item.name)),
    materialActions: ["Upload material to teacher-materials"],
    assignmentActions: (assignments.data ?? []).map((item) => String(item.title)),
    submissions: [`${submissions.data?.length ?? 0} submissions in queue`],
    grading: ["Open review queue"],
    aiTools: ["Compile Notes", "Create Test", "Create Assignment"],
  }
}

export async function getAdminDashboardData(context: IsKoolContext): Promise<AdminDashboardData> {
  const supabase = await createClient()
  if (!supabase) return adminFixture

  const [memberships, classes, audit] = await Promise.all([
    supabase.from("school_memberships").select("status").eq("school_id", context.school.id).limit(10),
    supabase.from("classes").select("name").eq("school_id", context.school.id).limit(10),
    supabase.from("audit_logs").select("action").eq("school_id", context.school.id).limit(10),
  ])

  if (memberships.error || classes.error || audit.error) {
    return adminFixture
  }

  return {
    source: "supabase",
    users: [`${memberships.data?.length ?? 0} memberships visible through RLS`],
    memberships: (memberships.data ?? []).map((item) => String(item.status)),
    classes: (classes.data ?? []).map((item) => String(item.name)),
    enrollments: ["Class enrollment management"],
    audit: (audit.data ?? []).map((item) => String(item.action)),
  }
}
