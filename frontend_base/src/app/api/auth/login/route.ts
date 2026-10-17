import { NextResponse } from "next/server"
import { z } from "zod"
import { isSameOrigin } from "@/lib/auth/same-origin"

import { loginWithIsKool, IsKoolAuthError } from "@/lib/iskool-auth/server"
import {
  accessCookieOptions,
  isIsKoolAuthConfigured,
  iskoolAuthCookies,
  refreshCookieOptions,
} from "@/lib/iskool-auth/shared"

const inputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  schoolId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403 })
  if (!isIsKoolAuthConfigured())
    return NextResponse.json({ error: "Sign in is not configured." }, { status: 503 })

  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 })

  try {
    const result = await loginWithIsKool(parsed.data)
    if ("status" in result) {
      return NextResponse.json(
        { code: result.status, schools: result.schools },
        { status: 409 }
      )
    }

    const response = NextResponse.json(
      { status: "AUTHENTICATED" },
      { headers: { "Cache-Control": "private, no-store" } }
    )
    if (result.accessTokens.sams)
      response.cookies.set(
        iskoolAuthCookies.samsAccess,
        result.accessTokens.sams,
        accessCookieOptions
      )
    else response.cookies.delete(iskoolAuthCookies.samsAccess)
    if (result.accessTokens.aps)
      response.cookies.set(
        iskoolAuthCookies.apsAccess,
        result.accessTokens.aps,
        accessCookieOptions
      )
    else response.cookies.delete(iskoolAuthCookies.apsAccess)
    response.cookies.set(
      iskoolAuthCookies.refresh,
      result.refreshToken,
      refreshCookieOptions
    )
    return response
  } catch (error) {
    const status = error instanceof IsKoolAuthError && error.status === 401 ? 401 : 502
    return NextResponse.json(
      { error: status === 401 ? "Invalid email or password." : "Sign in is temporarily unavailable." },
      { status }
    )
  }
}
