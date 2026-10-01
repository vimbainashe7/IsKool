import type * as React from "react"

import { requireActiveRole } from "@/features/context/role-routing"

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireActiveRole("teacher")

  return children
}
