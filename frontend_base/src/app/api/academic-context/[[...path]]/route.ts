import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getIsKoolApiUrls, iskoolAuthCookies } from "@/lib/iskool-auth/shared"
export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store" }
function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers })
}
export async function GET(
  request: Request,
  context: { params: Promise<{ path?: string[] }> }
) {
  const path = (await context.params).path?.join("/") ?? ""
  if (path && !/^classes\/[0-9a-f-]{36}$/i.test(path))
    return error("Class context action is unavailable.", 404)
  const url = new URL(request.url)
  if (
    [...url.searchParams.keys()].some(
      (key) => !["role", "limit", "cursor"].includes(key)
    )
  )
    return error("Invalid class context filter.", 400)
  const token = (await cookies()).get(iskoolAuthCookies.apsAccess)?.value
  if (!token) return error("Sign in to your Student or Teacher workspace.", 401)
  try {
    const response = await fetch(
      `${getIsKoolApiUrls().aps}/academic-context${path ? `/${path}` : ""}${url.search}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(
          process.env.NODE_ENV === "development" ? 30000 : 10000
        ),
        headers: {
          authorization: `Bearer ${token}`,
          "x-request-id": randomUUID(),
        },
      }
    )
    const result = await response.json().catch(() => null)
    if (!response.ok)
      return error(
        response.status === 404
          ? "This class is not available to your account."
          : response.status === 403
            ? "Your role cannot access this class context."
            : response.status >= 500
              ? "Classes are temporarily unavailable. Please retry."
              : "Check your session and class filters.",
        response.status
      )
    return NextResponse.json(result, { headers })
  } catch {
    return error("Classes could not be reached. Please retry.", 503)
  }
}
