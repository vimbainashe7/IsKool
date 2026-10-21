import type { Workspace } from "@/features/workspace/contracts"

const zone = "Africa/Harare"
export function teacherDate(instant: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(instant))
}
export function teacherModel(w: Workspace) {
  const ids = new Set(
    w.teachers
      .filter((t) => t.memberId === w.membershipId)
      .map((t) => t.classId)
  )
  const classes = w.classes.filter((c) => ids.has(c.id))
  const assignments = w.assignments.filter((a) => ids.has(a.classId))
  const assignmentIds = new Set(assignments.map((a) => a.id))
  const submissions = w.submissions.filter((s) =>
    assignmentIds.has(s.assignmentId)
  )
  const grades = w.grades.filter((g) =>
    submissions.some(
      (s) => s.id === g.submissionId && s.studentId === g.studentId
    )
  )
  const awaiting = submissions.filter(
    (s) =>
      s.status === "submitted" &&
      !grades.some((g) => g.submissionId === s.id && g.publishedAt)
  )
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(w.asOf))
  )
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "long",
  }).format(new Date(w.asOf))
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]
  const weekday = days.indexOf(weekdayName) + 1
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(w.asOf))
  const timetable = w.timetable
    .filter((t) => ids.has(t.classId))
    .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
  const today = timetable.filter((t) => t.weekday === weekday)
  const materials = w.materials.filter((m) => ids.has(m.classId))
  const jobs = w.jobs.filter((j) => ids.has(j.classId))
  const drafts = w.drafts.filter((d) => ids.has(d.classId))
  const progress = classes.map((c) => {
    const learners = new Set(
      w.enrollments.filter((e) => e.classId === c.id).map((e) => e.memberId)
    )
    const published = assignments.filter(
      (a) => a.classId === c.id && a.status === "published"
    )
    const expected = learners.size * published.length
    const received = new Set(
      submissions
        .filter(
          (s) =>
            published.some((a) => a.id === s.assignmentId) &&
            learners.has(s.studentId) &&
            s.status !== "returned"
        )
        .map((s) => `${s.assignmentId}:${s.studentId}`)
    ).size
    const marked = submissions.filter(
      (s) =>
        assignments.some(
          (a) => a.classId === c.id && a.id === s.assignmentId
        ) && grades.some((g) => g.submissionId === s.id && g.score !== null)
    ).length
    return {
      ...c,
      learners: learners.size,
      expected,
      received,
      percent: expected ? Math.round((received / expected) * 100) : null,
      marked,
      next: timetable.find(
        (t) =>
          t.classId === c.id &&
          (t.weekday > weekday ||
            (t.weekday === weekday && t.start.slice(0, 5) >= time))
      ),
      due: published
        .filter((a) => a.dueAt && Date.parse(a.dueAt) >= Date.parse(w.asOf))
        .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!))[0],
    }
  })
  const late = submissions.filter((s) => {
    const a = assignments.find((a) => a.id === s.assignmentId)
    return a?.dueAt && Date.parse(s.submittedAt) > Date.parse(a.dueAt)
  })
  return {
    academicWorkAvailable: w.mode !== "live",
    classes,
    assignments,
    submissions,
    grades,
    awaiting,
    hour,
    weekday,
    days,
    today,
    timetable,
    materials,
    progress,
    jobs,
    drafts,
    late,
  }
}
export type TeacherModel = ReturnType<typeof teacherModel>
