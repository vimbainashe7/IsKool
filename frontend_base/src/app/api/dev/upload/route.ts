import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { canUseDemoSession } from "@/dev/demo-session"
import { getCurrentSession } from "@/features/context/get-current-session"
import { readDemoWorkspace } from "@/dev/workspace-store"
import { validateLearningFile } from "@/features/storage/file-validation"
export async function POST(request: Request) {
  if (!canUseDemoSession())
    return NextResponse.json(
      { error: "Preview is unavailable." },
      { status: 404 }
    )
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Request could not be verified." },
      { status: 403 }
    )
  const session = await getCurrentSession()
  if (!session)
    return NextResponse.json({ error: "Sign in again." }, { status: 401 })
  const body = await request.formData()
  const file = body.get("file")
  const classId = String(body.get("classId") ?? "")
  const assignmentId = String(body.get("assignmentId") ?? "")
  if (!(file instanceof File) || validateLearningFile(file))
    return NextResponse.json(
      { error: "Choose a supported file no larger than 10 MB." },
      { status: 400 }
    )
  const w = await readDemoWorkspace(session.context)
  const allowed =
    session.context.activeRole === "student"
      ? w.enrollments.some(
          (e) => e.memberId === w.membershipId && e.classId === classId
        ) &&
        w.assignments.some(
          (a) =>
            a.id === assignmentId &&
            a.classId === classId &&
            a.status === "published"
        )
      : session.context.activeRole === "teacher" &&
        w.teachers.some(
          (t) => t.memberId === w.membershipId && t.classId === classId
        )
  if (!allowed)
    return NextResponse.json(
      { error: "You no longer have access." },
      { status: 403 }
    )
  const key = (await cookies()).get("iskool-demo-id")?.value
  if (!key || !/^[a-f0-9-]{36}$/.test(key))
    return NextResponse.json({ error: "Start a new preview." }, { status: 401 })
  const directory = path.join(process.cwd(), ".cache", "iskool-demo", key)
  await mkdir(directory, { recursive: true })
  const filename = crypto.randomUUID()
  const filePath = `demo/${filename}`
  await writeFile(
    path.join(directory, filename),
    Buffer.from(await file.arrayBuffer())
  )
  await writeFile(
    path.join(directory, `${filename}.json`),
    JSON.stringify({
      classId,
      assignmentId,
      memberId: w.membershipId,
      filename: file.name,
    })
  )
  return NextResponse.json(
    { filename: file.name, filePath },
    { headers: { "Cache-Control": "private, no-store" } }
  )
}
