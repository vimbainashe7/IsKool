import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

import { canUseDemoSession, demoSessionCookie } from "@/dev/demo-session"
import type { RoleKey } from "@/lib/permissions/capabilities"

const allowedRoles = new Set<RoleKey>(["student", "teacher", "admin"])

export async function GET(request: NextRequest) {
  if (!canUseDemoSession()) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  const roleParam = request.nextUrl.searchParams.get("role")
  const role = allowedRoles.has(roleParam as RoleKey) ? (roleParam as RoleKey) : "teacher"
  const cookieStore = await cookies()

  cookieStore.set(demoSessionCookie, role, {
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  })
  cookieStore.set("iskool-active-role", role, {
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  })

  return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url))
}
