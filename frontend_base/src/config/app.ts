import {
  Banknote,
  BarChart3,
  BookOpen,
  Brain,
  ClipboardCheck,
  FileQuestion,
  FileUp,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  Megaphone,
  MessageSquare,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Capability } from "@/lib/permissions/capabilities";

export type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  capability?: Capability;
  target?: string;
  items?: {
    title: string;
    url: string;
    capability?: Capability;
    target?: string;
  }[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const appConfig: {
  name: string
  description: string
  user: {
    name: string
    email: string
    avatar: string
  }
  navGroups: NavGroup[]
} = {
  name: "IsKool",
  description: "School operations platform",
  user: {
    name: "School Admin",
    email: "admin@iskool.local",
    avatar: "",
  },
  navGroups: [
    {
      label: "Workspace",
      items: [
        {
          title: "Student Dashboard",
          url: "/student/dashboard",
          icon: LayoutDashboard,
          capability: "dashboard.student",
        },
        {
          title: "Teacher Dashboard",
          url: "/teacher/dashboard",
          icon: ClipboardCheck,
          capability: "dashboard.teacher",
        },
        {
          title: "Admin Dashboard",
          url: "/admin/dashboard",
          icon: ShieldCheck,
          capability: "dashboard.admin",
        },
        {
          title: "Classes",
          url: "/classes",
          icon: BookOpen,
          capability: "classes.view",
        },
        {
          title: "Subjects",
          url: "/subjects",
          icon: Layers3,
          capability: "classes.view",
        },
        {
          title: "Assignments",
          url: "/assignments",
          icon: Megaphone,
          capability: "assignments.view",
        },
        {
          title: "Tests",
          url: "/tests",
          icon: FileQuestion,
          capability: "assignments.view",
        },
        {
          title: "Revision Tests",
          url: "/revision-tests",
          icon: RotateCcw,
          capability: "assignments.view",
        },
        {
          title: "Submit Assignment",
          url: "/student/assignments/demo-assignment",
          icon: FileUp,
          capability: "assignments.submit",
        },
        {
          title: "Grades",
          url: "/grades",
          icon: GraduationCap,
          capability: "grades.view_own",
        },
      ],
    },
    {
      label: "School Operations",
      items: [
        {
          title: "Teacher Materials",
          url: "/teacher/materials",
          icon: FileUp,
          capability: "assignments.manage",
        },
        {
          title: "AI Workspace",
          url: "/teacher/ai",
          icon: Brain,
          capability: "assignments.manage",
        },
        {
          title: "Students",
          url: "/students",
          icon: Users,
          capability: "students.manage",
        },
        {
          title: "Attendance",
          url: "/attendance",
          icon: UserCheck,
          capability: "attendance.manage",
        },
        {
          title: "Admissions",
          url: "/admissions",
          icon: ShieldCheck,
          capability: "admissions.manage",
        },
      ],
    },
    {
      label: "Administration",
      items: [
        {
          title: "Finance",
          url: "/finance",
          icon: Banknote,
          capability: "finance.view",
        },
        {
          title: "Staff",
          url: "/staff",
          icon: UserCog,
          capability: "staff.manage",
        },
        {
          title: "Reports",
          url: "/reports",
          icon: BarChart3,
          capability: "reports.view",
        },
      ],
    },
    {
      label: "System",
      items: [
        {
          title: "Notifications",
          url: "/notifications",
          icon: MessageSquare,
          capability: "notifications.view",
        },
        {
          title: "Search",
          url: "/search",
          icon: Search,
          capability: "search.use",
        },
        {
          title: "Settings",
          url: "/settings",
          icon: Settings,
          capability: "settings.manage",
          items: [
            {
              title: "Profile",
              url: "/settings/user",
              capability: "settings.manage",
            },
            {
              title: "Account",
              url: "/settings/account",
              capability: "settings.manage",
            },
            {
              title: "Notifications",
              url: "/settings/notifications",
              capability: "settings.manage",
            },
            {
              title: "Appearance",
              url: "/settings/appearance",
              capability: "settings.manage",
            },
          ],
        },
      ],
    },
  ],
};
