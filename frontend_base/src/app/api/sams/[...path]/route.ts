import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { isSameOrigin } from "@/lib/auth/same-origin"
import { getIsKoolApiUrls, iskoolAuthCookies } from "@/lib/iskool-auth/shared"
export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store" }
const uuid =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
const routes: Record<string, RegExp> = {
  GET: new RegExp(
    `^(students(?:/${uuid}(?:/account)?)?|guardians|student-administration/(?:context|summary|enrollments|accounts|classes(?:/${uuid}/teachers)?))$`
  ),
  POST: new RegExp(
    `^(students(?:/${uuid}/(?:guardians|enrollments))?|guardians|student-administration/(?:academic-years|academic-terms|classes(?:/${uuid}/teachers)?))$`
  ),
  PATCH: new RegExp(
    `^(students/${uuid}(?:/account)?|student-administration/(?:enrollments/${uuid}|classes/${uuid}/teachers/${uuid}))$`
  ),
}
function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers })
}
async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const path = (await context.params).path.join("/")
  if (!routes[request.method]?.test(path))
    return error("This school record action is unavailable.", 404)
  const url = new URL(request.url)
  if (request.method !== "GET" && !isSameOrigin(request))
    return error("This request could not be verified.", 403)
  if (
    [...url.searchParams.keys()].some(
      (key) =>
        !(
          path === "student-administration/accounts"
            ? ["cursor", "limit", "role", "search"]
            : path === "student-administration/classes"
              ? ["cursor", "limit", "search"]
              : ["cursor", "limit"]
        ).includes(key)
    )
  )
    return error("Invalid school record filter.", 400)
  const token = (await cookies()).get(iskoolAuthCookies.samsAccess)?.value
  if (!token) return error("Your session has expired. Sign in again.", 401)
  try {
    let body: string | undefined
    if (request.method !== "GET") {
      const reader = request.body?.getReader()
      if (!reader) return error("Enter the required school record fields.", 400)
      const chunks: Uint8Array[] = []
      let length = 0
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        length += chunk.value.length
        if (length > 16_384) {
          await reader.cancel()
          return error("This school record request is too large.", 413)
        }
        chunks.push(chunk.value)
      }
      body = Buffer.concat(chunks).toString("utf8")
      try {
        JSON.parse(body)
      } catch {
        return error("Enter valid school record fields.", 400)
      }
    }
    const { sams } = getIsKoolApiUrls()
    const target = `${sams}/${path}${url.search}`
    const options: RequestInit = {
      method: request.method,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(
        process.env.NODE_ENV === "development" ? 30_000 : 10_000
      ),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-request-id": randomUUID(),
      },
    }
    let response = await fetch(target, options)
    // Only retry an explicitly retryable, idempotent read. A shared signal
    // keeps both attempts within the original overall request deadline.
    if (request.method === "GET" && response.status === 503) {
      await response.body?.cancel()
      await new Promise((resolve) => setTimeout(resolve, 75))
      response = await fetch(target, options)
    }
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      const message =
        response.status === 401
          ? "Your session has expired. Sign in again."
          : response.status === 403
            ? "You do not have permission to manage student records."
            : response.status >= 500
              ? "School records are temporarily unavailable. Try again."
              : typeof result?.error?.message === "string"
                ? result.error.message
                : "Check the required fields and try again."
      return error(message, response.status)
    }
    return NextResponse.json(result, { status: response.status, headers })
  } catch {
    return error(
      "School records could not be reached. Your request may not have completed; reload before trying again.",
      503
    )
  }
}
export const GET = handle
export const POST = handle
export const PATCH = handle
