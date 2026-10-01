import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { demoSessionCookie } from "@/dev/demo-session"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  await supabase?.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(demoSessionCookie)
  cookieStore.delete("iskool-active-role")

  return NextResponse.redirect(new URL("/sign-in", request.url))
}
