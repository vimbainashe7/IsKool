"use client"
import { useState } from "react"
import {
  useWorkspace,
  useUnsavedChanges,
} from "@/features/workspace/workspace-provider"
import { mutationSchema, type Assignment } from "@/features/workspace/contracts"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ConfirmAction } from "@/components/feedback/confirm-action"
import { UploadField, type UploadedFile } from "@/features/storage/upload-field"
export function AssignmentEditor({ assignment }: { assignment?: Assignment }) {
  const { data: w, mutate, busy } = useWorkspace()
  const [step, setStep] = useState(0)
  const [savedId, setSavedId] = useState(assignment?.id)
  const [classId, setClassId] = useState(
    assignment?.classId ?? w.classes[0]?.id ?? ""
  )
  const [title, setTitle] = useState(assignment?.title ?? "")
  const [instructions, setInstructions] = useState(
    assignment?.instructions ?? ""
  )
  const [marks, setMarks] = useState(String(assignment?.totalMarks ?? 50))
  const [due, setDue] = useState(
    assignment?.dueAt
      ? new Date(Date.parse(assignment.dueAt) + 7200000)
          .toISOString()
          .slice(0, 16)
      : ""
  )
  const [late, setLate] = useState<"allow" | "deny">(
    assignment?.latePolicy === "deny" ? "deny" : "allow"
  )
  const [resubmit, setResubmit] = useState(assignment?.resubmission ?? false)
  const [file, setFile] = useState<UploadedFile | null>(null)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState("")
  useUnsavedChanges(dirty)
  function payload(publish: boolean) {
    return {
      action: "assignment.save" as const,
      id: savedId,
      classId,
      title,
      instructions,
      totalMarks: Number(marks),
      dueAt: due ? new Date(`${due}:00+02:00`).toISOString() : "",
      latePolicy: late,
      resubmission: resubmit,
      status: publish ? ("published" as const) : ("draft" as const),
      attachment: file?.filename ?? assignment?.attachment ?? "",
      attachmentPath: file?.filePath ?? assignment?.attachmentPath ?? "",
    }
  }
  async function save(publish: boolean) {
    const parsed = mutationSchema.safeParse(payload(publish))
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues)
        next[String(issue.path[0])] = issue.message
      setErrors(next)
      setStep(0)
      throw new Error("Check the highlighted fields before saving.")
    }
    const result = await mutate(parsed.data)
    if (result.id) setSavedId(result.id)
    setDirty(false)
    setStatus(publish ? "Assignment published." : "Assignment draft saved.")
  }
  function error(key: string) {
    return errors[key] ? (
      <p id={`${key}-error`} role="alert" className="text-sm text-destructive">
        {errors[key]}
      </p>
    ) : null
  }
  return (
    <div className="max-w-3xl space-y-5">
      <ol aria-label="Assignment steps" className="flex flex-wrap gap-3">
        {["Details", "Rules and attachment", "Preview"].map((label, i) => (
          <li key={label}>
            <Button
              variant={i === step ? "default" : "outline"}
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
            >
              {i + 1}. {label}
            </Button>
          </li>
        ))}
      </ol>
      <form
        className="space-y-4 rounded-xl border p-5"
        onChange={() => setDirty(true)}
        onSubmit={(e) => e.preventDefault()}
      >
        {step === 0 ? (
          <>
            <Label htmlFor="assignment-class">Class</Label>
            <select
              id="assignment-class"
              className="iskool-select"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value)
                setFile(null)
              }}
            >
              {w.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {error("classId")}
            <Label htmlFor="assignment-title">Title</Label>
            <Input
              id="assignment-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : undefined}
            />
            {error("title")}
            <Label htmlFor="assignment-instructions">Instructions</Label>
            <Textarea
              id="assignment-instructions"
              rows={7}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              aria-invalid={Boolean(errors.instructions)}
              aria-describedby={
                errors.instructions ? "instructions-error" : undefined
              }
            />
            {error("instructions")}
            <Label htmlFor="assignment-marks">Total marks</Label>
            <Input
              id="assignment-marks"
              type="number"
              min={1}
              max={1000}
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              aria-invalid={Boolean(errors.totalMarks)}
              aria-describedby={
                errors.totalMarks ? "totalMarks-error" : undefined
              }
            />
            {error("totalMarks")}
            <Label htmlFor="assignment-due">
              Due date and time (Africa/Harare)
            </Label>
            <Input
              id="assignment-due"
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              aria-invalid={Boolean(errors.dueAt)}
              aria-describedby={errors.dueAt ? "dueAt-error" : undefined}
            />
            {error("dueAt")}
          </>
        ) : step === 1 ? (
          <>
            <Label htmlFor="late-policy">Late submissions</Label>
            <select
              id="late-policy"
              className="iskool-select"
              value={late}
              onChange={(e) => setLate(e.target.value as "allow" | "deny")}
            >
              <option value="allow">Accept and mark as late</option>
              <option value="deny">Close at deadline</option>
            </select>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={resubmit}
                onChange={(e) => setResubmit(e.target.checked)}
              />
              Allow students to replace submitted work
            </label>
            <UploadField
              key={classId}
              classId={classId}
              disabled={w.mode !== "demo" || busy}
              onChange={(value) => {
                setFile(value)
                setDirty(true)
              }}
            />
          </>
        ) : (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Preview assignment</h2>
            <h3>{title || "Untitled assignment"}</h3>
            <p className="whitespace-pre-wrap">{instructions}</p>
            <p>
              {marks} marks · Due {due || "not set"} (Harare)
            </p>
            <p>
              Late submissions: {late}. Resubmission:{" "}
              {resubmit ? "allowed" : "not allowed"}.
            </p>
            {file && <p className="break-all">Attachment: {file.filename}</p>}
          </section>
        )}
        <div className="flex flex-wrap gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            <>
              <Button
                disabled={busy || w.mode !== "demo"}
                onClick={() => save(false).catch(() => {})}
              >
                Save draft
              </Button>
              <ConfirmAction
                label="Publish assignment"
                description={`Publish ?${title}? to the selected class? Students will see the instructions and deadline.`}
                disabled={busy || w.mode !== "demo"}
                onConfirm={() => save(true)}
              />
            </>
          )}
        </div>
      </form>
      {status && <p role="status">{status}</p>}
      {Object.keys(errors).length > 0 && (
        <p role="alert">
          Complete the required fields. Your work has been retained.
        </p>
      )}
    </div>
  )
}
