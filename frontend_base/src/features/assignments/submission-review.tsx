"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  useWorkspace,
  useUnsavedChanges,
} from "@/features/workspace/workspace-provider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ConfirmAction } from "@/components/feedback/confirm-action"
import { EmptyState } from "@/components/feedback/state-views"
import { parseMark } from "@/features/gradebook/gradebook-model"
export function SubmissionReview() {
  const { data: w, mutate, busy } = useWorkspace()
  const params = useSearchParams()
  const initial = w.submissions.find((s) => s.id === params.get("submission"))
  const [assignmentId, setAssignmentId] = useState(
    initial?.assignmentId ?? w.assignments[0]?.id ?? ""
  )
  const [selected, setSelected] = useState<string | null>(initial?.id ?? null)
  const [review, setReview] = useState<{
    id: string
    mark: string
    feedback: string
  } | null>(null)
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState("")
  const queue = w.submissions.filter((s) => s.assignmentId === assignmentId)
  const submission = queue.find((s) => s.id === selected) ?? queue[0]
  const index = queue.findIndex((s) => s.id === submission?.id)
  const grade = w.grades.find((g) => g.submissionId === submission?.id)
  const a = w.assignments.find((a) => a.id === assignmentId)
  useUnsavedChanges(dirty)
  const mark =
    review?.id === submission?.id
      ? review!.mark
      : grade?.score === null || grade?.score === undefined
        ? ""
        : String(grade.score)
  const feedback =
    review?.id === submission?.id ? review!.feedback : (grade?.feedback ?? "")
  function move(delta: number) {
    if (
      dirty &&
      !window.confirm(
        "Discard unsaved feedback before moving to another student?"
      )
    )
      return
    const next = queue[index + delta]
    if (next) {
      setSelected(next.id)
      setReview(null)
      setDirty(false)
      setNotice("")
    }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.altKey && ["ArrowRight", "ArrowLeft"].includes(e.key)) {
        e.preventDefault()
        move(e.key === "ArrowRight" ? 1 : -1)
      }
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  })
  async function save(publish: boolean) {
    if (!submission) return
    const parsed = parseMark(mark, a?.totalMarks ?? null)
    if (parsed.error) throw new Error(parsed.error)
    await mutate({
      action: "grades.save",
      entries: [
        {
          submissionId: submission.id,
          score: parsed.score,
          feedback,
          publish,
          version: grade?.version ?? 0,
        },
      ],
    })
    setDirty(false)
    setNotice(publish ? "Grade and feedback published." : "Review draft saved.")
  }
  const invalid = parseMark(mark, a?.totalMarks ?? null).error
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="review-assignment">Assignment</Label>
        <select
          id="review-assignment"
          className="iskool-select"
          value={assignmentId}
          onChange={(e) => {
            if (dirty && !window.confirm("Discard unsaved feedback?")) return
            setAssignmentId(e.target.value)
            setSelected(null)
            setReview(null)
            setDirty(false)
          }}
        >
          {w.assignments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
      </div>
      {submission ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={index <= 0}
              onClick={() => move(-1)}
            >
              Previous student
            </Button>
            <p>
              {index + 1} of {queue.length} ? Alt+Left / Alt+Right
            </p>
            <Button
              variant="outline"
              disabled={index >= queue.length - 1}
              onClick={() => move(1)}
            >
              Next student
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-4 rounded-xl border p-5">
              <h2 className="text-xl font-semibold">
                {w.members.find((m) => m.id === submission.studentId)?.name ??
                  "Learner"}
              </h2>
              <p className="break-all">{submission.filename}</p>
              <p>
                Submitted{" "}
                {new Date(submission.submittedAt).toLocaleString("en-ZW", {
                  timeZone: "Africa/Harare",
                })}
              </p>
              <p>
                Status:{" "}
                {grade?.publishedAt ? "Grade published" : "Awaiting review"}
                {a?.dueAt &&
                Date.parse(submission.submittedAt) > Date.parse(a.dueAt)
                  ? " · Late submission"
                  : ""}
              </p>
              <Button asChild variant="outline">
                <a href={`/api/files?type=submission&id=${submission.id}`}>
                  Download submission
                </a>
              </Button>
              <p className="text-sm text-muted-foreground">
                Preview downloaded work with your document viewer. Preview
                services are not connected yet.
              </p>
            </section>
            <section className="space-y-4 rounded-xl border p-5">
              <Label htmlFor="review-mark">
                Mark (maximum {a?.totalMarks ?? "not supplied"})
              </Label>
              <Input
                id="review-mark"
                inputMode="decimal"
                value={mark}
                onChange={(e) => {
                  setReview({
                    id: submission.id,
                    mark: e.target.value,
                    feedback,
                  })
                  setDirty(true)
                }}
                aria-invalid={Boolean(invalid)}
                aria-describedby={invalid ? "review-mark-error" : undefined}
              />
              {invalid && (
                <p
                  id="review-mark-error"
                  role="alert"
                  className="text-destructive"
                >
                  {invalid}
                </p>
              )}
              <Label htmlFor="review-feedback">Feedback</Label>
              <Textarea
                id="review-feedback"
                rows={7}
                value={feedback}
                onChange={(e) => {
                  setReview({
                    id: submission.id,
                    mark,
                    feedback: e.target.value,
                  })
                  setDirty(true)
                }}
              />
              <p role="status">
                {dirty ? "Unsaved review changes" : "Review up to date"}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={
                    !dirty || Boolean(invalid) || busy || w.mode !== "demo"
                  }
                  onClick={() => save(false).catch(() => {})}
                >
                  Save review draft
                </Button>
                <ConfirmAction
                  label="Publish grade and feedback"
                  description="Release this mark and feedback to the student?"
                  disabled={
                    Boolean(invalid) ||
                    !mark.trim() ||
                    busy ||
                    w.mode !== "demo"
                  }
                  onConfirm={() => save(true)}
                />
              </div>
              {notice && <p role="status">{notice}</p>}
            </section>
          </div>
        </>
      ) : (
        <EmptyState
          title="No submissions are waiting for review"
          description="Choose another assignment or return after students submit their work."
        />
      )}
    </div>
  )
}
