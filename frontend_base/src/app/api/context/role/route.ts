import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { getCurrentSession } from "@/features/context/get-current-session"
import type { RoleKey } from "@/lib/permissions/capabilities"

const allowedRoles = new Set<RoleKey>(["student", "teacher", "admin"])

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const role = body?.role as RoleKey | undefined

  if (!role || !allowedRoles.has(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  const session = await getCurrentSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!session.context.roles.includes(role)) {
    return NextResponse.json({ error: "Forbidden role" }, { status: 403 })
  }

  const cookieStore = await cookies()
  cookieStore.set("iskool-active-role", role, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  })

  return NextResponse.json({ role })
}
