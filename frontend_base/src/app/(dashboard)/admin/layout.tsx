import type * as React from "react"

import { requireActiveRole } from "@/features/context/role-routing"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireActiveRole("admin")

  return children
}
