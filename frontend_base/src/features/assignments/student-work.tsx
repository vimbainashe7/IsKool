"use client"
import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { toast, Toaster } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  useWorkspace,
  useUnsavedChanges,
} from "@/features/workspace/workspace-provider"
import {
  parseStudentPage,
  parseStudentDetail,
  studentRequest,
  submissionSchema,
  verifySubmission,
  type StudentDetail,
} from "./student-contracts"
const time = (s: string) =>
  new Date(s).toLocaleString("en-GB", { timeZone: "Africa/Harare" })
export function StudentWork({
  resourceId,
  compact = false,
}: {
  resourceId?: string
  compact?: boolean
}) {
  const { data: w } = useWorkspace()
  return resourceId ? (
    <StudentAnswer
      key={`${w.schoolId}:${w.membershipId}:${resourceId}`}
      id={resourceId}
    />
  ) : (
    <StudentAssignments
      key={`${w.schoolId}:${w.membershipId}`}
      compact={compact}
    />
  )
}
function StudentAssignments({ compact }: { compact: boolean }) {
  const { data: w } = useWorkspace(),
    [page, setPage] = useState<ReturnType<typeof parseStudentPage> | null>(
      null
    ),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [cursors, setCursors] = useState<Array<string | undefined>>([undefined])
  const cursor = cursors[cursors.length - 1]
  useEffect(() => {
    const abort = new AbortController()
    studentRequest(
      `?limit=${compact ? 3 : 25}${cursor ? `&cursor=${cursor}` : ""}`,
      "GET",
      undefined,
      abort.signal
    )
      .then((b) => parseStudentPage(b, w.schoolId, w.membershipId))
      .then((p) => {
        setPage(p)
        setError("")
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setPage(null)
          setError(
            e instanceof Error ? e.message : "Assignments could not be loaded."
          )
        }
      })
    return () => abort.abort()
  }, [w.schoolId, w.membershipId, compact, cursor, reload])
  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {compact ? "My Assignments" : "Published assignments"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p role="alert">{error}</p>
        ) : !page ? (
          <p role="status">Loading assignments…</p>
        ) : (
          <>
            {page.items.length === 0 ? (
              <p>
                No published assignments are available in your current
                enrollment.
              </p>
            ) : (
              page.items.map((a) => (
                <Link
                  key={a.id}
                  href={`/student/assignments/${a.id}`}
                  prefetch={false}
                  className="block rounded-xl border p-4 hover:bg-muted/40"
                >
                  <h3 className="font-semibold break-words">{a.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Due {time(a.dueAt)} · {a.totalMarks} marks
                  </p>
                  <p>
                    {a.latestSubmission
                      ? `${a.latestSubmission.status === "late" ? "Submitted late" : "Submitted"} · Attempt ${a.latestSubmission.attempt} of 3`
                      : "Not submitted"}
                  </p>
                </Link>
              ))
            )}
            {!compact && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={cursors.length === 1}
                  onClick={() => setCursors((c) => c.slice(0, -1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={!page.nextCursor}
                  onClick={() =>
                    setCursors((c) => [...c, page.nextCursor ?? undefined])
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setReload((n) => n + 1)}>
            Reload assignments
          </Button>
          {compact && (
            <Link
              className="underline self-center"
              href="/student/assignments"
              prefetch={false}
            >
              View all assignments
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
function StudentAnswer({ id }: { id: string }) {
  const { data: w } = useWorkspace(),
    [detail, setDetail] = useState<StudentDetail | null>(null),
    [answer, setAnswer] = useState(""),
    [saved, setSaved] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0)
  useUnsavedChanges(answer !== saved)
  useEffect(() => {
    const abort = new AbortController()
    studentRequest(`/${id}`, "GET", undefined, abort.signal)
      .then((b) => parseStudentDetail(b, w.schoolId, w.membershipId, id))
      .then((d) => {
        setDetail(d)
        setError("")
        const text = d.submissions[0]?.text ?? ""
        setAnswer(text)
        setSaved(text)
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setDetail(null)
          setError(
            e instanceof Error ? e.message : "Assignment could not be loaded."
          )
        }
      })
    return () => abort.abort()
  }, [id, w.schoolId, w.membershipId, reload])
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!detail) return
    setBusy(true)
    setError("")
    try {
      const result = (await studentRequest(`/${id}/submissions`, "POST", {
        text: answer.trim(),
        expectedAttempt: detail.submissions[0]?.attempt ?? 0,
      })) as { submission: unknown; duplicate?: boolean }
      const s = verifySubmission(
        submissionSchema.parse(result.submission),
        w.schoolId,
        w.membershipId,
        id
      )
      setDetail({
        ...detail,
        submissions: [
          s,
          ...detail.submissions.filter((x) => x.id !== s.id),
        ].sort((a, b) => b.attempt - a.attempt),
      })
      setAnswer(s.text)
      setSaved(s.text)
      toast.success(
        result.duplicate ? "Your answer is already saved." : "Answer submitted."
      )
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your answer could not be verified. Reload before retrying."
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-5">
      <Toaster richColors />
      <Link className="underline" href="/student/assignments" prefetch={false}>
        Back to assignments
      </Link>
      {error && (
        <div role="alert" className="rounded-xl border border-destructive p-4">
          {error}
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (
                answer !== saved &&
                !window.confirm("Reload and discard your unsaved answer?")
              )
                return
              setReload((n) => n + 1)
            }}
          >
            Reload assignment
          </Button>
        </div>
      )}
      {!detail && !error && <p role="status">Loading assignment…</p>}
      {detail && (
        <>
          <Card>
            <CardHeader>
              <CardTitle role="heading" aria-level={2} className="break-words">
                {detail.assignment.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>
                Due {time(detail.assignment.dueAt)} (Africa/Harare) ·{" "}
                {detail.assignment.totalMarks} marks
              </p>
              <p className="whitespace-pre-wrap break-words">
                {detail.assignment.instructions}
              </p>
              <p className="text-sm text-muted-foreground">
                Up to three attempts during your active term enrollment. Late
                answers are accepted and marked late. Each attempt and its
                submission time are retained. Files and grading are not
                available yet.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                Your answer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={submit}>
                <Label htmlFor="student-answer">Answer</Label>
                <Textarea
                  id="student-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  maxLength={10000}
                  rows={9}
                  disabled={busy || detail.submissions.length >= 3}
                />
                <p className="text-sm text-muted-foreground">
                  {answer.length}/10,000 characters ·{" "}
                  {detail.submissions.length}/3 attempts used
                </p>
                <Button
                  disabled={
                    busy ||
                    !answer.trim() ||
                    detail.submissions.length >= 3 ||
                    (detail.submissions.length > 0 && answer.trim() === saved)
                  }
                  type="submit"
                >
                  {busy
                    ? "Submitting…"
                    : detail.submissions.length
                      ? "Resubmit answer"
                      : "Submit answer"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                Submission history
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detail.submissions.length === 0 ? (
                <p>Not submitted.</p>
              ) : (
                detail.submissions.map((s) => (
                  <article key={s.id} className="rounded-xl border p-4">
                    <h3 className="font-semibold">
                      Attempt {s.attempt} ·{" "}
                      {s.status === "late" ? "Submitted late" : "Submitted"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {time(s.submittedAt)} (Africa/Harare)
                    </p>
                    <p className="whitespace-pre-wrap break-words mt-2">
                      {s.text}
                    </p>
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
