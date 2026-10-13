import type { Workspace, Assignment } from "@/features/workspace/contracts"

const schoolZone = "Africa/Harare"
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: schoolZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
export function schoolDayKey(instant: string) {
  const parts = dayFormatter.formatToParts(new Date(instant))
  const part = (type: string) => parts.find((p) => p.type === type)?.value
  return `${part("year")}-${part("month")}-${part("day")}`
}
export function calendarDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
export function calendarDate(key: string) {
  return new Date(`${key}T12:00:00`)
}
export function deadlineLabel(assignment: Assignment, now: string) {
  if (!assignment.dueAt) return "No deadline set"
  if (Date.parse(assignment.dueAt) < Date.parse(now)) return "Overdue"
  if (schoolDayKey(assignment.dueAt) === schoolDayKey(now)) return "Due today"
  return `Due ${new Intl.DateTimeFormat("en-GB", { timeZone: schoolZone, weekday: "short", day: "numeric", month: "short" }).format(new Date(assignment.dueAt))}`
}
export function studentDashboardModel(w: Workspace) {
  const enrolledIds = new Set(
    w.enrollments
      .filter((e) => e.memberId === w.membershipId)
      .map((e) => e.classId)
  )
  const classes = w.classes.filter((c) => enrolledIds.has(c.id))
  const assignments = w.assignments.filter(
    (a) => enrolledIds.has(a.classId) && a.status === "published"
  )
  const assignmentIds = new Set(assignments.map((a) => a.id))
  const submissions = w.submissions.filter(
    (s) => s.studentId === w.membershipId && assignmentIds.has(s.assignmentId)
  )
  const submittedIds = new Set(
    submissions
      .filter((s) => s.status !== "returned")
      .map((s) => s.assignmentId)
  )
  const pending = assignments
    .filter((a) => !submittedIds.has(a.id))
    .sort(
      (a, b) =>
        (a.dueAt ? Date.parse(a.dueAt) : Infinity) -
        (b.dueAt ? Date.parse(b.dueAt) : Infinity)
    )
  const todayKey = schoolDayKey(w.asOf)
  const today = calendarDate(todayKey)
  const weekday = today.getDay() || 7
  const currentTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: schoolZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(w.asOf))
  const schedule = w.timetable
    .filter((t) => enrolledIds.has(t.classId) && t.weekday === weekday)
    .sort((a, b) => a.start.localeCompare(b.start))
  const nextClass = schedule.find((s) => s.start.slice(0, 5) >= currentTime)
  const courses = [...classes]
    .sort(
      (a, b) =>
        Number(b.id === nextClass?.classId) -
        Number(a.id === nextClass?.classId)
    )
    .slice(0, 3)
    .map((c) => {
      const work = assignments.filter((a) => a.classId === c.id)
      const teacherId = w.teachers.find((t) => t.classId === c.id)?.memberId
      return {
        ...c,
        teacher: w.members.find((m) => m.id === teacherId)?.name,
        assignments: work.length,
        submitted: work.filter((a) => submittedIds.has(a.id)).length,
        resources: w.materials.filter(
          (m) => m.classId === c.id && m.status === "published"
        ).length,
        nextTask: pending.find((a) => a.classId === c.id),
        nextSlot: schedule.find(
          (s) => s.classId === c.id && s.start.slice(0, 5) >= currentTime
        ),
        highlighted: nextClass?.classId === c.id,
      }
    })
  const groups = ["Overdue", "Today", "Coming up", "No deadline"] as const
  const tasks = groups
    .map((label) => ({
      label,
      items: pending.filter((a) =>
        label === "No deadline"
          ? !a.dueAt
          : a.dueAt &&
            (label === "Overdue"
              ? Date.parse(a.dueAt) < Date.parse(w.asOf)
              : label === "Today"
                ? Date.parse(a.dueAt) >= Date.parse(w.asOf) &&
                  schoolDayKey(a.dueAt) === todayKey
                : Date.parse(a.dueAt) >= Date.parse(w.asOf) &&
                  schoolDayKey(a.dueAt) !== todayKey)
      ),
    }))
    .filter((g) => g.items.length)
  const feedback = w.grades
    .filter(
      (g) =>
        g.studentId === w.membershipId &&
        g.publishedAt &&
        submissions.some((s) => s.id === g.submissionId)
    )
    .sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!))
    .slice(0, 2)
    .map((g) => {
      const submission = submissions.find((s) => s.id === g.submissionId)!
      const assignment = assignments.find(
        (a) => a.id === submission.assignmentId
      )!
      return {
        ...g,
        assignment,
        className:
          classes.find((c) => c.id === assignment.classId)?.name ??
          "Your class",
      }
    })
  return {
    today,
    todayKey,
    courses,
    assignments,
    tasks,
    pending,
    submittedIds,
    schedule,
    nextClass,
    feedback,
    resources: w.materials.filter(
      (m) => enrolledIds.has(m.classId) && m.status === "published"
    ),
    classes,
    submittedCount: submittedIds.size,
  }
}
export type StudentDashboardModel = ReturnType<typeof studentDashboardModel>
