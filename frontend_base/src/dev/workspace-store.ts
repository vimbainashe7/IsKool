import "server-only"
import { mkdir, readFile, writeFile, rename } from "node:fs/promises"
import path from "node:path"
import { cookies } from "next/headers"
import { canUseDemoSession } from "./demo-session"
import { createWorkspaceFixture } from "./workspace-fixture"
import {
  workspaceSchema,
  type Workspace,
  type Mutation,
} from "@/features/workspace/contracts"
import { advanceDemoJobs, applyDemoMutation } from "./workspace-reducer"
import type { IsKoolContext } from "@/features/context/session-contract"
const pending = new Map<string, Promise<unknown>>()
async function location() {
  if (!canUseDemoSession()) throw new Error("Development adapter is disabled.")
  const key = (await cookies()).get("iskool-demo-id")?.value
  if (!key || !/^[a-f0-9-]{36}$/.test(key))
    throw new Error("Start a new development preview session.")
  const directory = path.join(process.cwd(), ".cache", "iskool-demo")
  await mkdir(directory, { recursive: true })
  return path.join(directory, `${key}.json`)
}
async function transaction<T>(
  operation: (w: Workspace) => Promise<T>
): Promise<T> {
  const file = await location()
  const previous = pending.get(file) ?? Promise.resolve()
  const task = previous
    .catch(() => undefined)
    .then(async () => {
      let w: Workspace
      try {
        w = workspaceSchema.parse(JSON.parse(await readFile(file, "utf8")))
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
        w = createWorkspaceFixture()
      }
      advanceDemoJobs(w)
      const result = await operation(w)
      const temporary = `${file}.${crypto.randomUUID()}.tmp`
      await writeFile(temporary, JSON.stringify(w), "utf8")
      await rename(temporary, file)
      return result
    })
  pending.set(file, task)
  try {
    return await task
  } finally {
    if (pending.get(file) === task) pending.delete(file)
  }
}
export function readDemoWorkspace(context: IsKoolContext) {
  return transaction(async (w) => {
    const result = structuredClone(w)
    result.asOf = new Date().toISOString()
    result.userId = context.user.id
    result.membershipId =
      context.activeRole === "student" ? "student-1" : "teacher-1"
    if (context.activeRole === "student") {
      result.members = result.members.filter(
        (m) => m.id === result.membershipId
      )
      result.assignments = result.assignments.filter(
        (a) => a.status === "published"
      )
      result.submissions = result.submissions.filter(
        (s) => s.studentId === result.membershipId
      )
      result.grades = result.grades.filter(
        (g) => g.studentId === result.membershipId && g.publishedAt
      )
      result.materials = result.materials.filter(
        (m) => m.status === "published"
      )
      result.drafts = result.drafts.filter((d) => d.status === "published")
      result.jobs = []
      result.audit = []
      result.enrollments = result.enrollments.filter(
        (e) => e.memberId === result.membershipId
      )
    }
    return result
  })
}
export function mutateDemoWorkspace(
  context: IsKoolContext,
  mutation: Mutation
) {
  return transaction(async (w) => {
    const actor = {
      ...w,
      membershipId:
        context.activeRole === "student" ? "student-1" : "teacher-1",
    }
    let reservation: {
      filePath: string
      filename: string
      classId: string
      assignmentId: string
    } | null = null
    if (mutation.action === "submission.finalize") {
      const assignment = w.assignments.find(
        (a) => a.id === mutation.assignmentId
      )
      reservation = { ...mutation, classId: assignment?.classId ?? "" }
    } else if (mutation.action === "material.save" && !mutation.id)
      reservation = { ...mutation, assignmentId: "" }
    else if (mutation.action === "assignment.save" && mutation.attachmentPath)
      reservation = {
        filePath: mutation.attachmentPath,
        filename: mutation.attachment,
        classId: mutation.classId,
        assignmentId: "",
      }
    if (reservation) {
      const name = reservation.filePath.split("/").pop()
      if (!name || !/^[a-f0-9-]{36}$/.test(name))
        throw new Error("Upload your file before confirming.")
      const file = await location()
      const metadata = JSON.parse(
        await readFile(
          path.join(
            path.dirname(file),
            path.basename(file, ".json"),
            `${name}.json`
          ),
          "utf8"
        )
      )
      if (
        metadata.classId !== reservation.classId ||
        metadata.assignmentId !== reservation.assignmentId ||
        metadata.memberId !== actor.membershipId ||
        metadata.filename !== reservation.filename
      )
        throw new Error("This file is not available for this work context.")
    }
    const result = applyDemoMutation(actor, mutation)
    Object.assign(w, result.workspace)
    return result.result
  })
}
