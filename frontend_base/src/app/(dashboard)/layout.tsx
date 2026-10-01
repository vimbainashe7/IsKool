import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/layouts/dashboard-shell"
import { getCurrentSession } from "@/features/context/get-current-session"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getCurrentSession()

  if (!session) {
    redirect("/sign-in")
  }

  return <DashboardShell context={session.context}>{children}</DashboardShell>
}
