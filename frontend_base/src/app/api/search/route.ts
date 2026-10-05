import { NextResponse } from "next/server"
import { getCurrentSession } from "@/features/context/get-current-session"
import { loadWorkspace } from "@/features/workspace/server"
import { hasCapability } from "@/lib/permissions/capabilities"
export async function GET(request: Request) {
  const session = await getCurrentSession()
  if (!session)
    return NextResponse.json({ error: "Sign in again." }, { status: 401 })
  if (!hasCapability(session.context.capabilities, "search.use"))
    return NextResponse.json(
      { error: "Search is unavailable." },
      { status: 403 }
    )
  const query = (new URL(request.url).searchParams.get("q") ?? "")
    .trim()
    .slice(0, 100)
    .toLowerCase()
  if (query.length < 2) return NextResponse.json([])
  try {
    const w = await loadWorkspace(session.context)
    const role = session.context.activeRole
    const results = [
      ...w.classes.map((c) => ({
        id: c.id,
        title: c.name,
        group: "Classes",
        href: `/${role}/classes/${c.id}`,
      })),
      ...w.assignments.map((a) => ({
        id: a.id,
        title: a.title,
        group: "Assignments",
        href:
          role === "admin" ? "/admin/classes" : `/${role}/assignments/${a.id}`,
      })),
      ...w.materials.map((m) => ({
        id: m.id,
        title: m.title,
        group: "Materials",
        href:
          role === "student"
            ? "/student/notes"
            : role === "teacher"
              ? "/teacher/materials"
              : "/admin/classes",
      })),
      ...(role === "admin"
        ? w.members.map((m) => ({
            id: m.id,
            title: m.name,
            group: "People",
            href: `/admin/users/${m.id}`,
          }))
        : []),
    ]
      .filter((r) => r.title.toLowerCase().includes(query))
      .slice(0, 30)
    return NextResponse.json(results, {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch {
    return NextResponse.json(
      { error: "Search could not be completed." },
      { status: 503 }
    )
  }
}
