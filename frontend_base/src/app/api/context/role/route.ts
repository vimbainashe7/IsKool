import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { getCurrentSession } from "@/features/context/get-current-session"
import type { RoleKey } from "@/lib/permissions/capabilities"

const allowedRoles = new Set<RoleKey>(["student", "teacher", "admin"])

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "This request could not be verified." },
      { status: 403 }
    )
  }
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
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  })

  return NextResponse.json({ role })
}
