import { redirect } from "next/navigation"

import {
  requireSession,
  roleDashboardRoutes,
} from "@/features/context/role-routing"

export default async function HomePage() {
  const session = await requireSession()

  redirect(roleDashboardRoutes[session.context.activeRole])
}
