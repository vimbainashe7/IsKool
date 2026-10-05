import { redirect } from "next/navigation"
import { requireSession } from "@/features/context/role-routing"
export default async function Page() {
  const session = await requireSession()
  redirect(`/${session.context.activeRole}/students`)
}
