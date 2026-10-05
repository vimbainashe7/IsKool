"use client"
import { useState } from "react"
import {
  useWorkspace,
  useUnsavedChanges,
} from "@/features/workspace/workspace-provider"
import { UploadField, type UploadedFile } from "./upload-field"
import { Records } from "@/features/workspace/records"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ConfirmAction } from "@/components/feedback/confirm-action"
export function MaterialWorkflow() {
  const { data: w, mutate, busy } = useWorkspace()
  const [classId, setClassId] = useState(w.classes[0]?.id ?? "")
  const [title, setTitle] = useState("")
  const [topic, setTopic] = useState("")
  const [file, setFile] = useState<UploadedFile | null>(null)
  const [status, setStatus] = useState("")
  useUnsavedChanges(Boolean(title || topic || file))
  const valid =
    title.trim().length >= 3 &&
    topic.trim().length >= 2 &&
    Boolean(file) &&
    Boolean(classId)
  async function save(publish: boolean) {
    if (!file) return
    await mutate({
      action: "material.save",
      classId,
      title,
      topic,
      ...file,
      status: publish ? "published" : "draft",
    })
    setTitle("")
    setTopic("")
    setFile(null)
    setStatus(
      publish ? "Material published to your class." : "Material draft saved."
    )
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-xl font-semibold">Upload teaching material</h2>
        <Label htmlFor="material-class">Class</Label>
        <select
          id="material-class"
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
        <Label htmlFor="material-topic">Topic</Label>
        <Input
          id="material-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          minLength={2}
        />
        <Label htmlFor="material-title">Title</Label>
        <Input
          id="material-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          minLength={3}
        />
        <UploadField
          key={classId + status}
          classId={classId}
          disabled={w.mode !== "demo" || !classId || busy}
          onChange={setFile}
        />
        {file && (
          <div>
            <h3 className="font-semibold">Preview</h3>
            <p className="break-all">
              {title} · {topic} · {file.filename}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={!valid || busy || w.mode !== "demo"}
            onClick={() => save(false).catch(() => {})}
          >
            Save draft
          </Button>
          <ConfirmAction
            label="Publish material"
            description="Publish this resource to students in the selected class?"
            disabled={!valid || busy || w.mode !== "demo"}
            onConfirm={() => save(true)}
          />
        </div>
        {status && <p role="status">{status}</p>}
      </section>
      <section className="space-y-5">
        <Records
          title="Teaching materials"
          empty="Upload your first teaching resource to this class."
          items={w.materials.map((m) => ({
            id: m.id,
            title: m.title,
            detail: `${m.topic} · ${m.filename}`,
            status: m.status,
            href: `/api/files?type=material&id=${m.id}`,
          }))}
        />
        {w.materials.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
          >
            <span>{m.title}</span>
            <ConfirmAction
              label={
                m.status === "draft"
                  ? "Publish saved draft"
                  : "Archive material"
              }
              description="Confirm the visibility change for this class resource."
              disabled={busy || w.mode !== "demo"}
              onConfirm={async () => {
                await mutate({
                  action: "material.save",
                  ...m,
                  status: m.status === "draft" ? "published" : "archived",
                })
              }}
            />
          </div>
        ))}
      </section>
    </div>
  )
}
