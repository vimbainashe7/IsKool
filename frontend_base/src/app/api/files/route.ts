import { NextResponse } from "next/server"
import { getCurrentSession } from "@/features/context/get-current-session"
import { loadWorkspace } from "@/features/workspace/server"
import { canUseDemoSession } from "@/dev/demo-session"
import { cookies } from "next/headers"
import { readFile } from "node:fs/promises"
import path from "node:path"
export async function GET(request: Request) {
  const session = await getCurrentSession()
  if (!session)
    return NextResponse.json({ error: "Sign in again." }, { status: 401 })
  const query = new URL(request.url).searchParams
  const id = query.get("id")
  const type = query.get("type")
  const w = await loadWorkspace(session.context).catch(() => null)
  const assignment =
    type === "assignment" ? w?.assignments.find((a) => a.id === id) : undefined
  const row = assignment
    ? { filePath: assignment.attachmentPath, filename: assignment.attachment }
    : type === "material"
      ? w?.materials.find((m) => m.id === id)
      : w?.submissions.find((s) => s.id === id)
  if (!row)
    return NextResponse.json(
      { error: "This file is not available." },
      { status: 404 }
    )
  // Do not sign URLs against the broad production Storage blueprint policies.
  if (!canUseDemoSession())
    return NextResponse.json(
      {
        error:
          "File downloads are unavailable while school services are being connected.",
      },
      { status: 503 }
    )
  const key = (await cookies()).get("iskool-demo-id")?.value
  const name = row.filePath.split("/").pop()
  if (!key || !name || !/^[a-f0-9-]{36}$/.test(name))
    return new Response(
      "Development sample resource. This fixture has no uploaded binary.",
      {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": "attachment; filename=sample-resource.txt",
          "Cache-Control": "private, no-store",
        },
      }
    )
  try {
    const file = await readFile(
      path.join(process.cwd(), ".cache", "iskool-demo", key, name)
    )
    return new Response(file, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch {
    return NextResponse.json(
      { error: "This file is no longer available." },
      { status: 404 }
    )
  }
}
