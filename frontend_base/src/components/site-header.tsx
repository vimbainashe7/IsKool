"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  BriefcaseBusiness,
  ClipboardList,
  FileBarChart,
  FileQuestion,
  GraduationCap,
  Layers3,
  RotateCcw,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react"

import { CommandSearch, SearchTrigger } from "@/components/command-search"
import { ModeToggle } from "@/components/mode-toggle"
import { SchoolLogo } from "@/components/school-logo"
import { ContextSwitcher } from "@/features/context/context-switcher"
import type { IsKoolContext } from "@/features/context/session-contract"
import { cn } from "@/lib/utils"
import type { RoleKey } from "@/lib/permissions/capabilities"

const roleNavItems: Record<RoleKey, {
  label: string
  href: string
  icon: LucideIcon
}[]> = {
  student: [
    { label: "Dashboard", href: "/student/dashboard", icon: GraduationCap },
    { label: "Classes", href: "/classes", icon: BookOpen },
    { label: "Subjects", href: "/subjects", icon: Layers3 },
    { label: "Assignments", href: "/assignments", icon: ClipboardList },
    { label: "Tests", href: "/tests", icon: FileQuestion },
    { label: "Revision Tests", href: "/revision-tests", icon: RotateCcw },
    { label: "Grades", href: "/grades", icon: FileBarChart },
  ],
  teacher: [
    { label: "Dashboard", href: "/teacher/dashboard", icon: GraduationCap },
    { label: "Classes", href: "/classes", icon: BookOpen },
    { label: "Subjects", href: "/subjects", icon: Layers3 },
    { label: "Assignments", href: "/assignments", icon: ClipboardList },
    { label: "Tests", href: "/tests", icon: FileQuestion },
    { label: "Revision Tests", href: "/revision-tests", icon: RotateCcw },
    { label: "Materials", href: "/teacher/materials", icon: Upload },
    { label: "AI Studio", href: "/teacher/ai", icon: ShieldCheck },
  ],
  admin: [
    { label: "Dashboard", href: "/admin/dashboard", icon: ShieldCheck },
    { label: "Students", href: "/students", icon: Users },
    { label: "Classes", href: "/classes", icon: BookOpen },
    { label: "Attendance", href: "/attendance", icon: ClipboardList },
    { label: "Admissions", href: "/admissions", icon: BriefcaseBusiness },
    { label: "Finance", href: "/finance", icon: FileBarChart },
    { label: "Reports", href: "/reports", icon: FileBarChart },
    { label: "Settings", href: "/settings/account", icon: Settings },
  ],
}

export function SiteHeader({ context }: { context: IsKoolContext }) {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const pathname = usePathname()
  const navItems = roleNavItems[context.activeRole]

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <header className="flex shrink-0 flex-col border-b bg-background/95 backdrop-blur transition-[width,height] ease-linear">
        <div className="flex min-h-(--header-height) w-full items-center gap-3 px-4 py-3 lg:gap-4 lg:px-6">
          <Link href="/home" className="hidden items-center gap-3 md:flex">
            <SchoolLogo school={context.school} subtitle="Powered by IsKool" />
          </Link>
          <div className="max-w-sm flex-1">
            <SearchTrigger onClick={() => setSearchOpen(true)} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ContextSwitcher context={context} />
            <ModeToggle />
          </div>
        </div>
        <nav className="w-full overflow-x-auto border-t border-iskool-cream/80 bg-iskool-cream/30 px-4 py-2 lg:px-6" aria-label={`${context.activeRole} navigation`}>
          <div className="mx-auto flex min-w-max max-w-[1480px] items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors",
                    isActive
                      ? "border-iskool-navy bg-iskool-navy text-iskool-cream"
                      : "border-iskool-cream bg-white/70 text-iskool-midnight hover:bg-iskool-cream"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </header>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} context={context} />
    </>
  )
}
