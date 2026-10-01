import type * as React from "react"

import { requireActiveRole } from "@/features/context/role-routing"

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireActiveRole("student")

  return children
}
