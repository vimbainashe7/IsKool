import { requireActiveRole } from "@/features/context/role-routing"
import { getStudentDashboardData } from "@/features/dashboards/dashboard-data"
import { StudentDashboard } from "@/features/dashboards/role-dashboard"

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await requireActiveRole("student")

  const data = await getStudentDashboardData(session.context)
  return <StudentDashboard data={data} context={session.context} />
}
