import { NextResponse } from "next/server"
import { getCurrentSession } from "@/features/context/get-current-session"
import { loadWorkspace } from "@/features/workspace/server"
import {
  actionCapabilities,
  mutationSchema,
} from "@/features/workspace/contracts"
import { hasCapability } from "@/lib/permissions/capabilities"
import { canUseDemoSession } from "@/dev/demo-session"
import { mutateDemoWorkspace } from "@/dev/workspace-store"
export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store" }
export async function GET() {
  const session = await getCurrentSession()
  if (!session)
    return NextResponse.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401, headers }
    )
  try {
    return NextResponse.json(
      await loadWorkspace(session.context, { includeAcademic: true }),
      { headers }
    )
  } catch {
    return NextResponse.json(
      { error: "Your workspace could not be loaded. Try again." },
      { status: 503, headers }
    )
  }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "This request could not be verified." },
      { status: 403, headers }
    )
  const session = await getCurrentSession()
  if (!session)
    return NextResponse.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401, headers }
    )
  const parsed = mutationSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the required fields and try again." },
      { status: 400, headers }
    )
  if (
    !hasCapability(
      session.context.capabilities,
      actionCapabilities[parsed.data.action]
    )
  )
    return NextResponse.json(
      { error: "You do not have permission to make this change." },
      { status: 403, headers }
    )
  if (!canUseDemoSession())
    return NextResponse.json(
      {
        error:
          "This change is unavailable while school services are being connected.",
      },
      { status: 503, headers }
    )
  try {
    return NextResponse.json(
      await mutateDemoWorkspace(session.context, parsed.data),
      { headers }
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "This change could not be saved.",
      },
      { status: 409, headers }
    )
  }
}
