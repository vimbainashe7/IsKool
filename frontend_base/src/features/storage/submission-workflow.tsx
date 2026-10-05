"use client"
import { useState } from "react"
import {
  useWorkspace,
  useUnsavedChanges,
} from "@/features/workspace/workspace-provider"
import { UploadField, type UploadedFile } from "./upload-field"
import { ConfirmAction } from "@/components/feedback/confirm-action"
import { PermissionState } from "@/components/feedback/state-views"
import { Button } from "@/components/ui/button"
export function SubmissionWorkflow({ assignmentId }: { assignmentId: string }) {
  const { data: w, mutate, busy } = useWorkspace()
  const [file, setFile] = useState<UploadedFile | null>(null)
  const [confirmed, setConfirmed] = useState("")
  useUnsavedChanges(Boolean(file) && !confirmed)
  const a = w.assignments.find(
    (a) => a.id === assignmentId && a.status === "published"
  )
  if (!a)
    return (
      <PermissionState
        title="This assignment is not available"
        description="Return to your assignments to see work you can access."
        actionLabel="Assignments"
        actionHref="/student/assignments"
      />
    )
  const submission = w.submissions.find(
    (s) => s.assignmentId === a.id && s.studentId === w.membershipId
  )
  const grade = w.grades.find(
    (g) => g.submissionId === submission?.id && g.publishedAt
  )
  const late = Boolean(a.dueAt && Date.parse(a.dueAt) < Date.parse(w.asOf))
  const closed = late && a.latePolicy !== "allow"
  const blocked =
    w.mode !== "demo" || closed || Boolean(submission && !a.resubmission)
  const state = grade
    ? "Graded"
    : submission
      ? a.dueAt && Date.parse(submission.submittedAt) > Date.parse(a.dueAt)
        ? "Submitted late"
        : "Submitted"
      : file
        ? "Draft"
        : "Not started"
  async function submit() {
    if (!file) return
    const result = await mutate({
      action: "submission.finalize",
      assignmentId: a!.id,
      ...file,
    })
    setConfirmed(result.confirmedAt ?? "")
    setFile(null)
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-xl font-semibold">{a.title}</h2>
        <p>{w.classes.find((c) => c.id === a.classId)?.name}</p>
        <p className="whitespace-pre-wrap">{a.instructions}</p>
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="font-semibold">Total marks</dt>
            <dd>{a.totalMarks ?? "Not supplied"}</dd>
          </div>
          <div>
            <dt className="font-semibold">Due date (Harare)</dt>
            <dd>
              {a.dueAt
                ? new Date(a.dueAt).toLocaleString("en-ZW", {
                    timeZone: "Africa/Harare",
                  })
                : "No deadline set"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Late policy</dt>
            <dd>
              {a.latePolicy === "allow"
                ? "Late submissions accepted"
                : a.latePolicy === "deny"
                  ? "Late submissions closed"
                  : "Not supplied ? ask your teacher"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Teacher</dt>
            <dd>
              {w.teachers
                .filter((t) => t.classId === a.classId)
                .map(
                  (t) =>
                    w.members.find((m) => m.id === t.memberId)?.name ??
                    "Class teacher"
                )
                .join(", ") || "Class teacher"}
            </dd>
          </div>
        </dl>
        {a.attachment && (
          <a
            className="underline"
            href={`/api/files?type=assignment&id=${a.id}`}
          >
            Download {a.attachment}
          </a>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Your submission</h2>
        <p role="status">
          Status: <strong>{state}</strong>
        </p>
        {submission && (
          <div className="rounded-xl border p-4">
            <p className="break-all">{submission.filename}</p>
            <p>
              Confirmed{" "}
              {new Date(submission.submittedAt).toLocaleString("en-ZW", {
                timeZone: "Africa/Harare",
              })}
            </p>
            <Button asChild variant="outline">
              <a href={`/api/files?type=submission&id=${submission.id}`}>
                Download your submission
              </a>
            </Button>
            {grade && (
              <p>
                Mark: {grade.score} · Feedback:{" "}
                {grade.feedback || "No written feedback"}
              </p>
            )}
          </div>
        )}
        {closed && <p>This assignment is no longer accepting submissions.</p>}
        {w.mode !== "demo" && (
          <p>
            Submission services are currently unavailable. Your work has not
            been submitted.
          </p>
        )}
        <UploadField
          key={a.id}
          classId={a.classId}
          assignmentId={a.id}
          onChange={setFile}
          disabled={blocked || busy}
        />
        {file && (
          <p className="break-all">
            Review: {file.filename}. Confirm to submit your work.
          </p>
        )}
        <ConfirmAction
          label="Submit assignment"
          description={`Submit ${file?.filename ?? "your file"} to ${a.title}? ${late ? "This will be a late submission." : ""}`}
          disabled={!file || blocked || busy}
          onConfirm={submit}
        />
        {confirmed && (
          <p role="status">
            Submitted. The server confirmed your work at{" "}
            {new Date(confirmed).toLocaleString("en-ZW", {
              timeZone: "Africa/Harare",
            })}
            .
          </p>
        )}
      </section>
    </div>
  )
}
