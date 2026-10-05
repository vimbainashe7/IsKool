import { redirect } from "next/navigation"
import { requireSession } from "@/features/context/role-routing"
export default async function Page() {
  const s = await requireSession()
  redirect(
    s.context.activeRole === "teacher"
      ? "/teacher/gradebook"
      : s.context.activeRole === "student"
        ? "/student/grades"
        : "/admin/dashboard"
  )
}
