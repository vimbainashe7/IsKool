import { requireActiveRole } from "@/features/context/role-routing"
import { getTeacherDashboardData } from "@/features/dashboards/dashboard-data"
import { TeacherDashboard } from "@/features/dashboards/role-dashboard"

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await requireActiveRole("teacher")

  const data = await getTeacherDashboardData(session.context)
  return <TeacherDashboard data={data} context={session.context} />
}
