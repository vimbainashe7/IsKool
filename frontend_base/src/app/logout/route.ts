import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { demoSessionCookie } from "@/dev/demo-session"
import { logoutFromIsKool } from "@/lib/iskool-auth/server"
import {
  isIsKoolAuthConfigured,
  iskoolAuthCookies,
} from "@/lib/iskool-auth/shared"
import { createClient } from "@/lib/supabase/server"
import { isSameOrigin } from "@/lib/auth/same-origin"
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Request could not be verified." },
      { status: 403 }
    )
  const store = await cookies()
  if (isIsKoolAuthConfigured()) {
    await logoutFromIsKool({
      sams: store.get(iskoolAuthCookies.samsAccess)?.value,
      aps: store.get(iskoolAuthCookies.apsAccess)?.value,
    }).catch(() => undefined)
    Object.values(iskoolAuthCookies).forEach((name) => store.delete(name))
  } else {
    const client = await createClient()
    const result = await client?.auth.signOut()
    if (result?.error)
      return NextResponse.redirect(
        new URL("/home?notice=logout-failed", request.url),
        303
      )
  }
  store.delete(demoSessionCookie)
  store.delete("iskool-active-role")
  store.delete("iskool-demo-id")
  return NextResponse.redirect(new URL("/sign-in", request.headers.get("origin")!), 303)
}
export function GET(request: Request) {
  return NextResponse.redirect(new URL("/home", request.url))
}
