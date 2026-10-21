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
async function proxy(
  request: Request,
  context: { params: Promise<{ path?: string[] }> }
) {
  const path = (await context.params).path?.join("/") ?? "",
    method = request.method
  const resource =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (
    !(method === "GET" && (!path || resource.test(path))) &&
    !(
      method === "POST" &&
      (!path ||
        (resource.test(path.split("/")[0]) &&
          /\/(publish|archive)$/.test(path) &&
          path.split("/").length === 2))
    ) &&
    !(method === "PATCH" && resource.test(path))
  )
    return error("Assignment action is unavailable.", 404)
  const url = new URL(request.url)
  if (
    [...url.searchParams.keys()].some(
      (key) => method !== "GET" || path || !["limit", "cursor"].includes(key)
    )
  )
    return error("Invalid assignment filter.", 400)
  if (method !== "GET" && !isSameOrigin(request))
    return error("This request could not be verified.", 403)
  const token = (await cookies()).get(iskoolAuthCookies.apsAccess)?.value
  if (!token) return error("Sign in to your Teacher workspace.", 401)
  let body: string | undefined
  if (method !== "GET") {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return error("Use a valid assignment form.", 400)
    // Bound streaming input even if the caller omits Content-Length.
    const reader = request.body?.getReader(),
      chunks: Uint8Array[] = []
    let size = 0
    if (!reader) return error("Assignment details are required.", 400)
    while (true) {
      const result = await reader.read()
      if (result.done) break
      size += result.value.byteLength
      if (size > 32768) {
        await reader.cancel()
        return error("Assignment details are too long.", 413)
      }
      chunks.push(result.value)
    }
    body = Buffer.concat(chunks).toString("utf8")
  }
  try {
    const response = await fetch(
      `${getIsKoolApiUrls().aps}/assignments${path ? `/${path}` : ""}${url.search}`,
      {
        method,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(
          process.env.NODE_ENV === "development" ? 30000 : 10000
        ),
        headers: {
          authorization: `Bearer ${token}`,
          "x-request-id": randomUUID(),
          ...(body ? { "content-type": "application/json" } : {}),
        },
      }
    )
    const result = await response.json().catch(() => null)
    if (!response.ok)
      return error(
        response.status >= 500
          ? "Assignments are temporarily unavailable. Reload before retrying a save."
          : typeof result?.error?.message === "string"
            ? result.error.message
            : "Check the assignment details and your teaching access.",
        response.status
      )
    return NextResponse.json(result, { status: response.status, headers })
  } catch {
    return error(
      "The assignment could not be verified. Reload before retrying a save.",
      503
    )
  }
}
export const GET = proxy
export const POST = proxy
export const PATCH = proxy
