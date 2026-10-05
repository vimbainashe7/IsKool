import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { demoSessionCookie } from "@/dev/demo-session"
import { createClient } from "@/lib/supabase/server"
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Request could not be verified." },
      { status: 403 }
    )
  const client = await createClient()
  const result = await client?.auth.signOut()
  if (result?.error)
    return NextResponse.redirect(
      new URL("/home?notice=logout-failed", request.url),
      303
    )
  const store = await cookies()
  store.delete(demoSessionCookie)
  store.delete("iskool-active-role")
  store.delete("iskool-demo-id")
  return NextResponse.redirect(new URL("/sign-in", request.url), 303)
}
export function GET(request: Request) {
  return NextResponse.redirect(new URL("/home", request.url))
}
