"use client"
import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast, Toaster } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { ConfirmAction } from "@/components/feedback/confirm-action"
import {
  useWorkspace,
  useUnsavedChanges,
} from "@/features/workspace/workspace-provider"
import {
  parseClassContext,
  type ClassContext,
} from "@/features/classes/contracts"
import {
  assignmentRequest,
  draftSchema,
  parseAssignment,
  parseAssignmentPage,
  type LiveAssignment,
} from "./live-contracts"
const deadlineLabel = (value: string) =>
  new Date(value).toLocaleString("en-GB", { timeZone: "Africa/Harare" })
async function classContext(
  path: string,
  schoolId: string,
  membershipId: string,
  signal?: AbortSignal
) {
  const response = await fetch(`/api/academic-context${path}`, {
    cache: "no-store",
    signal,
  })
  if (!response.ok)
    throw new Error("Your teaching classes could not be loaded. Please retry.")
  return parseClassContext(
    await response.json(),
    schoolId,
    membershipId,
    "teacher"
  )
}
export function LiveAssignments({
  resourceId,
  create = false,
}: {
  resourceId?: string
  create?: boolean
}) {
  return create || resourceId ? (
    <AssignmentForm key={resourceId ?? "new"} resourceId={resourceId} />
  ) : (
    <AssignmentList />
  )
}
export function AssignmentList({ compact = false }: { compact?: boolean }) {
  const { data: workspace } = useWorkspace()
  const [page, setPage] = useState<ReturnType<
      typeof parseAssignmentPage
    > | null>(null),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [cursors, setCursors] = useState<Array<string | undefined>>([undefined])
  const cursor = cursors[cursors.length - 1]
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    assignmentRequest(
      `?limit=${compact ? 3 : 25}${cursor ? `&cursor=${cursor}` : ""}`,
      "GET",
      undefined,
      controller.signal
    )
      .then((body) =>
        parseAssignmentPage(body, workspace.schoolId, workspace.membershipId)
      )
      .then((result) => {
        if (active) {
          setPage(result)
          setError("")
        }
      })
      .catch((e) => {
        if (active) {
          setPage(null)
          setError(
            e instanceof Error ? e.message : "Assignments could not be loaded."
          )
        }
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [compact, cursor, reload, workspace.schoolId, workspace.membershipId])
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>My assignments</CardTitle>
          <Button asChild variant="outline">
            <Link
              prefetch={false}
              href={
                compact ? "/teacher/assignments" : "/teacher/assignments/new"
              }
            >
              {compact ? "View assignments" : "Create assignment"}
            </Link>
          </Button>
        </div>
        <CardDescription>
          Your saved coursework for classes you currently teach.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div role="alert">
            <p>{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                setError("")
                setReload((n) => n + 1)
              }}
            >
              Reload assignments
            </Button>
          </div>
        ) : !page ? (
          <p role="status">Loading assignments...</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {(["draft", "published", "archived"] as const).map((status) => (
                <div
                  className="rounded-xl border p-3"
                  key={status}
                  aria-label={`${status} assignments`}
                >
                  <p className="capitalize">{status}</p>
                  <p className="text-2xl font-semibold">
                    {page.summary[status]}
                  </p>
                </div>
              ))}
            </div>
            {page.items.length ? (
              page.items.map((row) => (
                <article className="rounded-xl border p-4" key={row.id}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <Link
                      className="font-semibold underline"
                      prefetch={false}
                      href={`/teacher/assignments/${row.id}`}
                    >
                      {row.title}
                    </Link>
                    <span className="capitalize">{row.status}</span>
                  </div>
                  <p className="mt-2 text-sm">
                    Due {deadlineLabel(row.dueAt)} · {row.totalMarks} marks
                  </p>
                  <Link
                    className="text-sm underline"
                    prefetch={false}
                    href={`/teacher/classes/${row.classId}`}
                  >
                    Open class
                  </Link>
                </article>
              ))
            ) : (
              <p>
                No assignments saved yet. Create a draft for one of your
                assigned classes.
              </p>
            )}
            {!compact && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  disabled={cursors.length === 1}
                  onClick={() => {
                    setPage(null)
                    setCursors((c) => c.slice(0, -1))
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={!page.nextCursor}
                  onClick={() => {
                    setPage(null)
                    setCursors((c) => [...c, page.nextCursor ?? undefined])
                  }}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
function AssignmentForm({ resourceId }: { resourceId?: string }) {
  const { data: workspace } = useWorkspace(),
    router = useRouter()
  const [classCursor, setClassCursor] = useState<string>()
  const [row, setRow] = useState<LiveAssignment | null>(null),
    [classes, setClasses] = useState<ClassContext | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0)
  const [classId, setClassId] = useState(""),
    [termId, setTermId] = useState(""),
    [title, setTitle] = useState(""),
    [instructions, setInstructions] = useState(""),
    [marks, setMarks] = useState("50"),
    [due, setDue] = useState("")
  useUnsavedChanges(dirty)
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    async function load() {
      try {
        const saved = resourceId
          ? parseAssignment(
              await assignmentRequest(
                `/${resourceId}`,
                "GET",
                undefined,
                controller.signal
              ),
              workspace.schoolId,
              workspace.membershipId
            )
          : null
        const context = await classContext(
          saved
            ? `/classes/${saved.classId}?role=teacher&limit=1`
            : "?role=teacher&limit=25",
          workspace.schoolId,
          workspace.membershipId,
          controller.signal
        )
        if (!active) return
        setClasses(context)
        setRow(saved)
        if (saved) {
          setClassId(saved.classId)
          setTermId(saved.academicTermId)
          setTitle(saved.title)
          setInstructions(saved.instructions)
          setMarks(String(saved.totalMarks))
          setDue(
            new Date(Date.parse(saved.dueAt) + 7200000)
              .toISOString()
              .slice(0, 16)
          )
        }
        setError("")
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Assignment could not be loaded."
          )
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
      controller.abort()
    }
  }, [resourceId, reload, workspace.schoolId, workspace.membershipId])
  const selected = classes?.classes.find((c) => c.id === classId),
    editable = !row || row.status === "draft"
  function change(action: () => void) {
    action()
    setDirty(true)
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    setError("")
    const parsed = draftSchema.safeParse({
      title,
      instructions,
      totalMarks: Number(marks),
      dueAt:
        due && Number.isFinite(Date.parse(`${due}:00+02:00`))
          ? new Date(`${due}:00+02:00`).toISOString()
          : "",
    })
    if (!parsed.success || !classId || !termId) {
      setError(
        parsed.success
          ? "Choose a class and academic term."
          : (parsed.error.issues[0]?.message ?? "Check the assignment fields.")
      )
      return
    }
    setBusy(true)
    try {
      const saved = parseAssignment(
        await assignmentRequest(
          row ? `/${row.id}` : "",
          row ? "PATCH" : "POST",
          row
            ? { ...parsed.data, version: row.version }
            : { ...parsed.data, classId, academicTermId: termId }
        ),
        workspace.schoolId,
        workspace.membershipId
      )
      setRow(saved)
      setDirty(false)
      toast.success("Draft saved")
      if (!resourceId) router.replace(`/teacher/assignments/${saved.id}`)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Draft could not be saved. Your changes are retained."
      )
    } finally {
      setBusy(false)
    }
  }
  async function transition(action: "publish" | "archive") {
    if (!row) return
    setBusy(true)
    setError("")
    try {
      const saved = parseAssignment(
        await assignmentRequest(`/${row.id}/${action}`, "POST", {
          version: row.version,
        }),
        workspace.schoolId,
        workspace.membershipId
      )
      setRow(saved)
      toast.success(
        action === "publish" ? "Assignment published" : "Assignment archived"
      )
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Assignment could not be changed."
      )
      throw e
    } finally {
      setBusy(false)
    }
  }
  async function nextClasses(cursor?: string) {
    setBusy(true)
    setError("")
    try {
      setClasses(
        await classContext(
          `?role=teacher&limit=25${cursor ? `&cursor=${cursor}` : ""}`,
          workspace.schoolId,
          workspace.membershipId
        )
      )
      setClassCursor(cursor)
      setClassId("")
      setTermId("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Classes could not be loaded.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{row ? row.title : "Assignment details"}</CardTitle>
        <CardDescription>
          {row
            ? `Saved ${row.status} · Version ${row.version}`
            : "Prepare a text assignment for a class you teach. Times use Africa/Harare."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Toaster richColors />
        <Link href="/teacher/assignments" className="underline">
          Back to assignments
        </Link>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive p-3"
          >
            <p>{error}</p>
            {!classes && (
              <Button
                variant="outline"
                onClick={() => {
                  setLoading(true)
                  setReload((n) => n + 1)
                }}
              >
                Reload assignment
              </Button>
            )}
          </div>
        )}
        {loading ? (
          <p role="status">Loading teaching context...</p>
        ) : (
          classes && (
            <form onSubmit={save} className="space-y-5">
              <fieldset
                disabled={busy || !editable}
                className="space-y-5 [&_input:disabled]:opacity-100 [&_textarea:disabled]:opacity-100"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="assignment-class">Class</Label>
                    <select
                      id="assignment-class"
                      required
                      disabled={!!row}
                      className="mt-2 w-full rounded-lg border bg-background p-3"
                      value={classId}
                      onChange={(e) =>
                        change(() => {
                          setClassId(e.target.value)
                          setTermId("")
                        })
                      }
                    >
                      <option value="">Choose your class</option>
                      {classes.classes.map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name} · {c.academicYear.label}
                        </option>
                      ))}
                    </select>
                    {!row && classes.nextCursor && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          void nextClasses(classes.nextCursor ?? undefined)
                        }
                      >
                        More classes
                      </Button>
                    )}
                    {!row && classCursor && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void nextClasses()}
                      >
                        First classes
                      </Button>
                    )}
                    {!row && !classes.classes.length && (
                      <p>Ask your administrator to assign a teaching class.</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="assignment-term">Academic term</Label>
                    <select
                      id="assignment-term"
                      required
                      disabled={!!row || !selected}
                      className="mt-2 w-full rounded-lg border bg-background p-3"
                      value={termId}
                      onChange={(e) => change(() => setTermId(e.target.value))}
                    >
                      <option value="">Choose the term</option>
                      {selected?.terms.map((t) => (
                        <option value={t.id} key={t.id}>
                          {t.label} · {t.startsOn} to {t.endsOn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="assignment-title">Title</Label>
                  <Input
                    id="assignment-title"
                    required
                    maxLength={160}
                    value={title}
                    onChange={(e) => change(() => setTitle(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="assignment-instructions">Instructions</Label>
                  <Textarea
                    id="assignment-instructions"
                    required
                    maxLength={10000}
                    rows={7}
                    value={instructions}
                    onChange={(e) =>
                      change(() => setInstructions(e.target.value))
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="assignment-marks">Total marks</Label>
                    <Input
                      id="assignment-marks"
                      type="number"
                      required
                      min="0.01"
                      max="1000"
                      step="0.01"
                      value={marks}
                      onChange={(e) => change(() => setMarks(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="assignment-due">
                      Deadline (Africa/Harare)
                    </Label>
                    <Input
                      id="assignment-due"
                      type="datetime-local"
                      required
                      value={due}
                      onChange={(e) => change(() => setDue(e.target.value))}
                    />
                  </div>
                </div>
              </fieldset>
              {editable && (
                <Button
                  type="submit"
                  disabled={busy || !classes.classes.length}
                >
                  {busy ? "Saving..." : "Save draft"}
                </Button>
              )}
              {dirty && row && (
                <p>Save your changes before publishing or archiving.</p>
              )}
            </form>
          )
        )}
        {row && !loading && (
          <div className="flex flex-wrap gap-3">
            {row.status === "draft" && (
              <ConfirmAction
                label="Publish assignment"
                description="Publish this saved draft? Published instructions and marks cannot be edited."
                disabled={busy || dirty}
                onConfirm={() => transition("publish")}
              />
            )}{" "}
            {row.status !== "archived" && (
              <ConfirmAction
                label="Archive assignment"
                description="Retain this assignment in history and close it to further changes?"
                disabled={busy || dirty}
                onConfirm={() => transition("archive")}
              />
            )}
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Text assignments are saved in your school records. Attachments and
          student submissions are not available yet.
        </p>
      </CardContent>
    </Card>
  )
}
