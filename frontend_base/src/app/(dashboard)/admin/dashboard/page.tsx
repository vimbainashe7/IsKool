import { requireActiveRole } from "@/features/context/role-routing"
import { getAdminDashboardData } from "@/features/dashboards/dashboard-data"
import { AdminDashboard } from "@/features/dashboards/role-dashboard"

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await requireActiveRole("admin")

  const data = await getAdminDashboardData(session.context)
  return <AdminDashboard data={data} context={session.context} />
}
