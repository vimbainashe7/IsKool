import type { Workspace } from "@/features/workspace/contracts"

export const schoolZone = "Africa/Harare"
export const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]
export function schoolDate(
  instant: string,
  options: Intl.DateTimeFormatOptions = {}
) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: schoolZone,
    day: "numeric",
    month: "short",
    ...options,
  }).format(new Date(instant))
}
export function schoolWeekday(instant: string) {
  return (
    weekdays.indexOf(
      schoolDate(instant, { weekday: "long", day: undefined, month: undefined })
    ) + 1
  )
}
export function adminModel(w: Workspace) {
  const peopleAvailable = !w.warnings.some((v) =>
    /people could not be loaded/i.test(v)
  )
  const timetableAvailable = !w.warnings.some((v) =>
    /timetable.*unavailable/i.test(v)
  )
  const auditAvailable = !w.warnings.some((v) => /audit.*unavailable/i.test(v))
  const members = [...new Map(w.members.map((m) => [m.id, m])).values()]
  const classes = [...new Map(w.classes.map((c) => [c.id, c])).values()]
  const classIds = new Set(classes.map((c) => c.id))
  const students = members.filter((m) => m.roles.includes("student"))
  const teachers = members.filter((m) => m.roles.includes("teacher"))
  const activeStudents = students.filter((m) => m.status === "active")
  const activeTeachers = teachers.filter((m) => m.status === "active")
  const enrollments = [
    ...new Map(
      w.enrollments
        .filter(
          (e) =>
            classIds.has(e.classId) &&
            (!peopleAvailable || students.some((m) => m.id === e.memberId))
        )
        .map((e) => [`${e.classId}:${e.memberId}`, e])
    ).values(),
  ]
  const teaching = [
    ...new Map(
      w.teachers
        .filter((t) => classIds.has(t.classId))
        .map((t) => [`${t.classId}:${t.memberId}`, t])
    ).values(),
  ]
  const enrolledStudents = activeStudents.filter((m) =>
    enrollments.some((e) => e.memberId === m.id)
  )
  const unassignedClasses = classes.filter((c) => {
    const links = teaching.filter((t) => t.classId === c.id)
    return (
      !links.length ||
      links.every((t) => {
        const member = members.find((m) => m.id === t.memberId)
        return member ? !activeTeachers.some((m) => m.id === member.id) : false
      })
    )
  })
  const timetable = [
    ...new Map(
      w.timetable.filter((t) => classIds.has(t.classId)).map((t) => [t.id, t])
    ).values(),
  ].sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
  const weekday = schoolWeekday(w.asOf)
  const today = timetable.filter((t) => t.weekday === weekday)
  const conflicts: {
    first: string
    second: string
    type: "Room" | "Teacher"
  }[] = []
  for (let i = 0; i < timetable.length; i++) {
    for (let j = i + 1; j < timetable.length; j++) {
      const a = timetable[i],
        b = timetable[j]
      if (a.weekday !== b.weekday || a.start >= b.end || b.start >= a.end)
        continue
      if (
        a.room.trim() &&
        a.room.trim().toLowerCase() === b.room.trim().toLowerCase()
      )
        conflicts.push({ first: a.id, second: b.id, type: "Room" })
      if (
        peopleAvailable &&
        teaching.some(
          (t) =>
            t.classId === a.classId &&
            activeTeachers.some((m) => m.id === t.memberId) &&
            teaching.some(
              (other) =>
                other.classId === b.classId && other.memberId === t.memberId
            )
        )
      )
        conflicts.push({ first: a.id, second: b.id, type: "Teacher" })
    }
  }
  return {
    members,
    classes,
    students,
    teachers,
    activeStudents,
    activeTeachers,
    enrollments,
    teaching,
    enrolledStudents,
    unassignedClasses,
    timetable,
    today,
    weekday,
    conflicts,
    peopleAvailable,
    timetableAvailable,
    auditAvailable,
    invited: members.filter((m) => m.status === "invited"),
    suspended: members.filter((m) => m.status === "suspended"),
    studentsWithoutClass: activeStudents.filter(
      (m) => !enrollments.some((e) => e.memberId === m.id)
    ),
    teachersWithoutClass: activeTeachers.filter(
      (m) => !teaching.some((e) => e.memberId === m.id)
    ),
    audit: [...w.audit].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
  }
}
