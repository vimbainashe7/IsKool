import { redirect } from "next/navigation"

import { getCurrentSession } from "@/features/context/get-current-session"
import type { SessionContract } from "@/features/context/session-contract"
import type { RoleKey } from "@/lib/permissions/capabilities"

export const roleDashboardRoutes: Record<RoleKey, string> = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
}

export async function requireSession(): Promise<SessionContract> {
  const session = await getCurrentSession()

  if (!session) {
    redirect("/sign-in")
  }

  return session
}

export async function requireActiveRole(role: RoleKey): Promise<SessionContract> {
  const session = await requireSession()

  if (session.context.activeRole !== role) {
    redirect(roleDashboardRoutes[session.context.activeRole])
  }

  return session
}
