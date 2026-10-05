import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  FileUp,
  Brain,
  Users,
  ShieldCheck,
  CalendarDays,
  Search,
  Bell,
  Settings,
  HelpCircle,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { hasCapability, type Capability } from "@/lib/permissions/capabilities"
import type { IsKoolContext } from "@/features/context/session-contract"
export type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  capability?: Capability
  target?: string
  items?: {
    title: string
    url: string
    capability?: Capability
    target?: string
  }[]
}
export type NavGroup = { label: string; items: NavItem[] }
const items: NavItem[] = [
  {
    title: "Dashboard",
    url: "/:role/dashboard",
    icon: LayoutDashboard,
    capability: "home.view",
  },
  {
    title: "Classes",
    url: "/:role/classes",
    icon: BookOpen,
    capability: "classes.view",
  },
  {
    title: "Assignments",
    url: "/:role/assignments",
    icon: ClipboardCheck,
    capability: "assignments.view",
  },
  {
    title: "Grades and feedback",
    url: "/student/grades",
    icon: GraduationCap,
    capability: "grades.view_own",
  },
  {
    title: "Notes and resources",
    url: "/student/notes",
    icon: BookOpen,
    capability: "assignments.submit",
  },
  {
    title: "Teaching materials",
    url: "/teacher/materials",
    icon: FileUp,
    capability: "materials.manage",
  },
  {
    title: "Submission review",
    url: "/teacher/submissions",
    icon: ClipboardCheck,
    capability: "submissions.review",
  },
  {
    title: "Gradebook",
    url: "/teacher/gradebook",
    icon: GraduationCap,
    capability: "grades.manage",
  },
  { title: "AI Studio", url: "/teacher/ai", icon: Brain, capability: "ai.use" },
  {
    title: "Timetable",
    url: "/:role/timetable",
    icon: CalendarDays,
    capability: "timetable.view",
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
    capability: "users.manage",
  },
  {
    title: "Students",
    url: "/admin/students",
    icon: Users,
    capability: "students.manage",
  },
  {
    title: "Teachers",
    url: "/admin/teachers",
    icon: Users,
    capability: "users.manage",
  },
  {
    title: "Enrollment",
    url: "/admin/enrollments",
    icon: ClipboardCheck,
    capability: "enrollments.manage",
  },
  {
    title: "Roles and access",
    url: "/admin/roles",
    icon: ShieldCheck,
    capability: "roles.manage",
  },
  {
    title: "Audit history",
    url: "/admin/audit",
    icon: ShieldCheck,
    capability: "audit.view",
  },
  {
    title: "Attendance",
    url: "/:role/attendance",
    icon: ClipboardCheck,
    capability: "attendance.manage",
  },
  {
    title: "Finance",
    url: "/admin/finance",
    icon: ClipboardCheck,
    capability: "finance.view",
  },
  {
    title: "Staff and HR",
    url: "/admin/staff",
    icon: Users,
    capability: "staff.manage",
  },
  {
    title: "Reports",
    url: "/admin/reports",
    icon: ClipboardCheck,
    capability: "reports.view",
  },
]
export const appConfig = {
  name: "IsKool",
  description: "Your school workspace",
  navGroups: [{ label: "Workspace", items }],
}
export function navigationFor(context: IsKoolContext): NavGroup[] {
  return [
    {
      label: "Workspace",
      items: items
        .filter((item) => hasCapability(context.capabilities, item.capability))
        .map((item) => ({
          ...item,
          url: item.url.replace(":role", context.activeRole),
        })),
    },
    {
      label: "Support and preferences",
      items: [
        { title: "Notifications", url: "/notifications", icon: Bell },
        { title: "Search", url: "/search", icon: Search },
        { title: "Settings", url: "/settings/account", icon: Settings },
        { title: "Help", url: "/help", icon: HelpCircle },
      ],
    },
  ]
}
