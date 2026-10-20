import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getIsKoolApiUrls, iskoolAuthCookies } from "@/lib/iskool-auth/shared"
import { isSameOrigin } from "@/lib/auth/same-origin"
export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store" }
function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers })
}
async function handle(
  request: Request,
  context: { params: Promise<{ path?: string[] }> }
) {
  const path = (await context.params).path?.join("/") ?? ""
  if (
    !(
      {
        GET: [""],
        PATCH: ["", "profile"],
        POST: ["logo", "save"],
        DELETE: ["logo"],
      } as Record<string, string[]>
    )[request.method]?.includes(path)
  )
    return error("Settings action unavailable.", 404)
  if (new URL(request.url).search)
    return error("Settings filters are not supported.", 400)
  if (request.method !== "GET" && !isSameOrigin(request))
    return error("This request could not be verified.", 403)
  const token = (await cookies()).get(iskoolAuthCookies.samsAccess)?.value
  if (!token) return error("Sign in with your school Admin account.", 401)
  try {
    let body: BodyInit | undefined
    const outgoing: Record<string, string> = {
      authorization: `Bearer ${token}`,
      "x-request-id": randomUUID(),
    }
    if (request.method !== "GET") {
      const limit = request.method === "POST" ? 2 * 1024 * 1024 + 16384 : 4096
      const reader = request.body?.getReader()
      if (!reader) return error("Enter the required settings.", 400)
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const part = await reader.read()
        if (part.done) break
        size += part.value.length
        if (size > limit) {
          await reader.cancel()
          return error(
            "Settings request is too large. Logo uploads are limited to 2 MB.",
            413
          )
        }
        chunks.push(part.value)
      }
      body = Buffer.concat(chunks)
      const contentType = request.headers.get("content-type") ?? ""
      if (
        request.method === "POST"
          ? !contentType.startsWith("multipart/form-data; boundary=")
          : !contentType.startsWith("application/json")
      )
        return error("Enter valid settings or choose a logo file.", 400)
      outgoing["content-type"] = contentType
    }
    const response = await fetch(
      `${getIsKoolApiUrls().sams}/school-settings${path ? `/${path}` : ""}`,
      {
        method: request.method,
        body,
        headers: outgoing,
        cache: "no-store",
        signal: AbortSignal.timeout(
          process.env.NODE_ENV === "development" ? 30000 : 10000
        ),
      }
    )
    const result = await response.json().catch(() => null)
    if (!response.ok)
      return error(
        response.status === 403
          ? "Only your school Admin can change these settings."
          : response.status >= 500
            ? "Settings are temporarily unavailable. Reload before retrying."
            : (result?.error?.message ??
              "Settings could not be saved. Reload and check the fields."),
        response.status
      )
    return NextResponse.json(result, { status: response.status, headers })
  } catch {
    return error(
      "Settings could not be reached. Reload to check whether your change was saved.",
      503
    )
  }
}
export const GET = handle
export const PATCH = handle
export const POST = handle
export const DELETE = handle
