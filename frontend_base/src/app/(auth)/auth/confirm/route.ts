import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { safeReturnPath } from "@/lib/auth/safe-return-path"
import { createClient } from "@/lib/supabase/server"
const types = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
])
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams
  const client = await createClient()
  const token_hash = query.get("token_hash")
  const type = query.get("type")
  const code = query.get("code")
  let valid = false
  if (client && code)
    valid = !(await client.auth.exchangeCodeForSession(code)).error
  else if (client && token_hash && type && types.has(type)) {
    valid = !(
      await client.auth.verifyOtp({ token_hash, type: type as EmailOtpType })
    ).error
  }
  const next = safeReturnPath(
    query.get("next"),
    type === "recovery" ? "/update-password" : "/home"
  )
  return NextResponse.redirect(
    new URL(valid ? next : "/sign-in?notice=invalid-link", request.url)
  )
}
