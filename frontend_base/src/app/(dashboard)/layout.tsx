

import { DashboardShell } from "@/components/layouts/dashboard-shell"
import { requireSession } from "@/features/context/role-routing"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()


  return <DashboardShell context={session.context}>{children}</DashboardShell>
}
