import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { demoSessionCookie } from "@/dev/demo-session"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  cookieStore.delete(demoSessionCookie)
  cookieStore.delete("iskool-active-role")

  return NextResponse.redirect(new URL("/sign-in", request.url))
}
