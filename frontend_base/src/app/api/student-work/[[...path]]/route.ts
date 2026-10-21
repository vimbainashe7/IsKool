import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getIsKoolApiUrls, iskoolAuthCookies } from "@/lib/iskool-auth/shared"
import { isSameOrigin } from "@/lib/auth/same-origin"
export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store" }
const error = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers })
async function proxy(
  request: Request,
  context: { params: Promise<{ path?: string[] }> }
) {
  const path = (await context.params).path ?? [],
    method = request.method,
    uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (
    !(
      method === "GET" &&
      (path.length === 0 || (path.length === 1 && uuid.test(path[0])))
    ) &&
    !(
      method === "POST" &&
      path.length === 2 &&
      uuid.test(path[0]) &&
      path[1] === "submissions"
    )
  )
    return error("This school-work action is unavailable.", 404)
  const url = new URL(request.url)
  if (
    [...url.searchParams.keys()].some(
      (k) =>
        method !== "GET" || path.length > 0 || !["cursor", "limit"].includes(k)
    )
  )
    return error("Invalid school-work filter.", 400)
  if (method !== "GET" && !isSameOrigin(request))
    return error("This request could not be verified.", 403)
  const token = (await cookies()).get(iskoolAuthCookies.apsAccess)?.value
  if (!token) return error("Sign in to your Student workspace.", 401)
  let body: string | undefined
  if (method === "POST") {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return error("Use a valid submission form.", 400)
    const reader = request.body?.getReader(),
      chunks: Uint8Array[] = []
    let size = 0
    if (!reader) return error("Your answer is required.", 400)
    while (true) {
      const p = await reader.read()
      if (p.done) break
      size += p.value.byteLength
      if (size > 32768) {
        await reader.cancel()
        return error("Your answer is too long.", 413)
      }
      chunks.push(p.value)
    }
    body = Buffer.concat(chunks).toString("utf8")
  }
  try {
    const r = await fetch(
      `${getIsKoolApiUrls().aps}/student-work${path.length ? `/${path.join("/")}` : ""}${url.search}`,
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
    const result = await r.json().catch(() => null)
    if (!r.ok)
      return error(
        r.status >= 500
          ? "School work is temporarily unavailable. Reload before retrying a submission."
          : typeof result?.error?.message === "string"
            ? result.error.message
            : "Check your answer and current enrollment.",
        r.status
      )
    return NextResponse.json(result, { status: r.status, headers })
  } catch {
    return error(
      "Your submission could not be verified. Reload before retrying.",
      503
    )
  }
}
export const GET = proxy
export const POST = proxy
