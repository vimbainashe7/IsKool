export const capabilities = [
  "home.view",
  "dashboard.student",
  "dashboard.teacher",
  "dashboard.admin",
  "classes.view",
  "assignments.view",
  "assignments.manage",
  "assignments.submit",
  "grades.view_own",
  "grades.manage",
  "admissions.manage",
  "students.manage",
  "finance.view",
  "payments.record",
  "attendance.manage",
  "staff.manage",
  "reports.view",
  "users.manage",
  "settings.manage",
  "notifications.view",
  "search.use",
] as const

export type Capability = (typeof capabilities)[number]

export type RoleKey = "student" | "teacher" | "admin"

export const roleCapabilities: Record<RoleKey, Capability[]> = {
  student: [
    "home.view",
    "dashboard.student",
    "classes.view",
    "assignments.view",
    "assignments.submit",
    "grades.view_own",
    "notifications.view",
    "search.use",
    "settings.manage",
  ],
  teacher: [
    "home.view",
    "dashboard.teacher",
    "classes.view",
    "assignments.view",
    "assignments.manage",
    "grades.manage",
    "attendance.manage",
    "notifications.view",
    "search.use",
    "settings.manage",
  ],
  admin: [
    "home.view",
    "dashboard.admin",
    "classes.view",
    "admissions.manage",
    "students.manage",
    "finance.view",
    "payments.record",
    "attendance.manage",
    "staff.manage",
    "reports.view",
    "users.manage",
    "settings.manage",
    "notifications.view",
    "search.use",
  ],
}

export function hasCapability(
  userCapabilities: readonly Capability[],
  requiredCapability?: Capability
) {
  return !requiredCapability || userCapabilities.includes(requiredCapability)
}

export function capabilitiesForRoles(roles: readonly RoleKey[]) {
  return Array.from(new Set(roles.flatMap((role) => roleCapabilities[role] ?? [])))
}
