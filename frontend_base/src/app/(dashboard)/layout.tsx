import { DashboardShell } from "@/components/layouts/dashboard-shell"
import { requireSession } from "@/features/context/role-routing"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"
export async function generateMetadata(): Promise<Metadata> {
  const { context } = await requireSession()
  return {
    title: {
      default: context.school.name,
      template: `%s · ${context.school.name}`,
    },
    ...(context.school.logoUrl
      ? { icons: { icon: context.school.logoUrl } }
      : {}),
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()

  return <DashboardShell context={session.context}>{children}</DashboardShell>
}
