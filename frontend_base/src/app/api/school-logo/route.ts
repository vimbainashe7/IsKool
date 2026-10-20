import { cookies } from "next/headers"
import { getIsKoolApiUrls, iskoolAuthCookies } from "@/lib/iskool-auth/shared"
import { randomUUID } from "node:crypto"
export const dynamic = "force-dynamic"
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
}
export async function GET() {
  const store = await cookies()
  const sams = store.get(iskoolAuthCookies.samsAccess)?.value
  const aps = store.get(iskoolAuthCookies.apsAccess)?.value
  const token = sams ?? aps
  if (!token) return new Response(null, { status: 401, headers })
  try {
    const urls = getIsKoolApiUrls()
    const response = await fetch(
      `${sams ? urls.sams : urls.aps}/auth/school-logo`,
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
    if (!response.ok)
      return new Response(null, {
        status: response.status >= 500 ? 503 : response.status,
        headers,
      })
    if (response.headers.get("content-type")?.split(";")[0] !== "image/webp")
      return new Response(null, { status: 502, headers })
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength > 49152)
      return new Response(null, { status: 502, headers })
    return new Response(bytes, {
      headers: { ...headers, "Content-Type": "image/webp" },
    })
  } catch {
    return new Response(null, { status: 503, headers })
  }
}
