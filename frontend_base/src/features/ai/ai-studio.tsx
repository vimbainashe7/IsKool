"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  useWorkspace,
  useUnsavedChanges,
} from "@/features/workspace/workspace-provider"
import type { AiDraft, Mutation } from "@/features/workspace/contracts"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ConfirmAction } from "@/components/feedback/confirm-action"
import { Records } from "@/features/workspace/records"
type CreateJob = Extract<Mutation, { action: "ai.create" }>
const tools = [
  {
    id: "compile-notes",
    label: "Compile Notes",
    description: "Turn class resources into a structured revision draft.",
  },
  {
    id: "create-test",
    label: "Test Generator",
    description: "Prepare questions and marking guidance for teacher review.",
  },
  {
    id: "create-assignment",
    label: "Assignment Generator",
    description: "Create tasks that can become an ordinary assignment draft.",
  },
] as const
export function AiStudio() {
  const { data: w, mutate, busy, refresh } = useWorkspace()
  const params = useSearchParams()
  const requested = params.get("tool")
  const [tool, setTool] = useState<CreateJob["tool"]>(
    tools.some((t) => t.id === requested)
      ? (requested as CreateJob["tool"])
      : "compile-notes"
  )
  const [classId, setClassId] = useState(w.classes[0]?.id ?? "")
  const [topic, setTopic] = useState("")
  const [instructions, setInstructions] = useState("")
  const [sources, setSources] = useState<string[]>([])
  const [count, setCount] = useState(5)
  const [marks, setMarks] = useState(50)
  const [difficulty, setDifficulty] =
    useState<CreateJob["difficulty"]>("medium")
  const [detail, setDetail] = useState<CreateJob["detail"]>("standard")
  const [questionTypes, setQuestionTypes] = useState<
    CreateJob["questionTypes"]
  >(["short answer"])
  const [selected, setSelected] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [submitted, setSubmitted] = useState(false)
  useUnsavedChanges(Boolean(topic || instructions) && !submitted)
  const hasPending = w.jobs.some((j) =>
    ["queued", "processing"].includes(j.status)
  )
  useEffect(() => {
    if (!hasPending) return
    const interval = setInterval(() => {
      refresh().catch(() =>
        setNotice(
          "Job status could not be refreshed. Your job has been retained; try again."
        )
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [hasPending, refresh])
  async function generate() {
    try {
      await mutate({
        action: "ai.create",
        classId,
        tool,
        topic,
        instructions,
        sourceIds: sources,
        questionCount: count,
        totalMarks: marks,
        difficulty,
        questionTypes,
        detail,
      })
      setSubmitted(true)
      setNotice("Job queued. You can leave and return to check progress.")
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "The job could not be queued.")
    }
  }
  const draft = w.drafts.find((d) => d.id === selected)
  return (
    <div className="space-y-7">
      <div className="grid gap-4 md:grid-cols-3">
        {tools.map((t) => (
          <button
            key={t.id}
            className={`rounded-xl border p-5 text-left focus-visible:outline-2 focus-visible:outline-primary ${tool === t.id ? "border-primary bg-secondary" : ""}`}
            onClick={() => setTool(t.id)}
            aria-pressed={tool === t.id}
          >
            <h2 className="text-lg font-semibold">{t.label}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.description}
            </p>
          </button>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4 rounded-xl border p-5">
          <h2 className="text-xl font-semibold">
            Configure {tools.find((t) => t.id === tool)?.label}
          </h2>
          <Label htmlFor="ai-class">Class</Label>
          <select
            id="ai-class"
            className="iskool-select"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value)
              setSources([])
            }}
          >
            {w.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Label htmlFor="ai-topic">Topic</Label>
          <Input
            id="ai-topic"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value)
              setSubmitted(false)
            }}
          />
          <Label htmlFor="ai-instructions">
            Learning objective and instructions
          </Label>
          <Textarea
            id="ai-instructions"
            rows={4}
            value={instructions}
            onChange={(e) => {
              setInstructions(e.target.value)
              setSubmitted(false)
            }}
          />
          <fieldset className="space-y-2 rounded-lg border p-3">
            <legend>Source materials</legend>
            {w.materials
              .filter((m) => m.classId === classId && m.status !== "archived")
              .map((m) => (
                <label key={m.id} className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={sources.includes(m.id)}
                    onChange={(e) =>
                      setSources((old) =>
                        e.target.checked
                          ? [...old, m.id]
                          : old.filter((id) => id !== m.id)
                      )
                    }
                  />
                  {m.title}
                </label>
              ))}
            <p className="text-sm text-muted-foreground">
              Upload new sources through Teaching Materials, then return here.
            </p>
          </fieldset>
          {tool === "compile-notes" ? (
            <>
              <Label htmlFor="ai-detail">Detail level</Label>
              <select
                id="ai-detail"
                className="iskool-select"
                value={detail}
                onChange={(e) => setDetail(e.target.value as typeof detail)}
              >
                <option value="brief">Brief</option>
                <option value="standard">Standard</option>
                <option value="detailed">Detailed</option>
              </select>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ai-count">Number of questions/tasks</Label>
                  <Input
                    id="ai-count"
                    type="number"
                    min={1}
                    max={30}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="ai-marks">Total marks</Label>
                  <Input
                    id="ai-marks"
                    type="number"
                    min={1}
                    max={1000}
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                  />
                </div>
              </div>
              <Label htmlFor="ai-difficulty">Difficulty</Label>
              <select
                id="ai-difficulty"
                className="iskool-select"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as typeof difficulty)
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <fieldset>
                <legend>Question types</legend>
                {(
                  [
                    "multiple choice",
                    "short answer",
                    "structured",
                    "true/false",
                    "essay",
                    "problem solving",
                  ] as const
                ).map((type) => (
                  <label
                    key={type}
                    className="flex min-h-11 items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={questionTypes.includes(type)}
                      onChange={(e) =>
                        setQuestionTypes((old) =>
                          e.target.checked
                            ? [...old, type]
                            : old.filter((t) => t !== type)
                        )
                      }
                    />
                    {type}
                  </label>
                ))}
              </fieldset>
            </>
          )}
          <Button
            disabled={
              busy ||
              w.mode !== "demo" ||
              !classId ||
              topic.trim().length < 3 ||
              instructions.trim().length < 10 ||
              !questionTypes.length ||
              count < 1 ||
              count > 30 ||
              marks <= 0
            }
            onClick={generate}
          >
            {busy ? "Queuing…" : "Generate draft"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Generated content always needs teacher review. It is never
            automatically published.
          </p>
          {notice && <p role="status">{notice}</p>}
        </section>
        <section className="space-y-5">
          <h2 className="text-xl font-semibold">Recent AI jobs</h2>
          {!w.jobs.length && (
            <p>No jobs yet. Configure a tool to prepare your first draft.</p>
          )}
          {w.jobs.map((job) => (
            <article key={job.id} className="space-y-3 rounded-xl border p-4">
              <h3 className="font-semibold">{job.topic}</h3>
              <p role="status">Job: {job.status}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(job.createdAt).toLocaleString("en-ZW", {
                  timeZone: "Africa/Harare",
                })}{" "}
                · {job.tool}
              </p>
              {job.error && <p role="alert">{job.error}</p>}
              {job.status === "completed" ? (
                <Button
                  onClick={() =>
                    setSelected(
                      w.drafts.find((d) => d.jobId === job.id)?.id ?? null
                    )
                  }
                >
                  Review draft
                </Button>
              ) : ["failed", "canceled"].includes(job.status) ? (
                <Button
                  disabled={busy || w.mode !== "demo"}
                  onClick={() =>
                    mutate({ action: "ai.retry", jobId: job.id }).catch(
                      () => {}
                    )
                  }
                >
                  Retry job
                </Button>
              ) : (
                <ConfirmAction
                  label="Cancel job"
                  description="Cancel this generation request?"
                  disabled={busy || w.mode !== "demo"}
                  onConfirm={async () => {
                    await mutate({ action: "ai.cancel", jobId: job.id })
                  }}
                />
              )}
            </article>
          ))}
          <Records
            title="Drafts awaiting review"
            empty="No completed drafts need review."
            items={w.drafts
              .filter(
                (d) =>
                  d.status === "draft" &&
                  w.jobs.some(
                    (j) => j.id === d.jobId && j.status === "completed"
                  )
              )
              .map((d) => ({ id: d.id, title: d.title, status: d.status }))}
          />
          <Records
            title="Published outputs"
            empty="No generated outputs have been published."
            items={w.drafts
              .filter((d) => d.status === "published")
              .map((d) => ({ id: d.id, title: d.title, status: d.status }))}
          />
        </section>
      </div>
      {draft && <DraftEditor key={draft.id} draft={draft} />}
    </div>
  )
}
function DraftEditor({ draft: d }: { draft: AiDraft }) {
  const { data: w, mutate, busy } = useWorkspace()
  const [title, setTitle] = useState(d.title)
  const [body, setBody] = useState(d.body)
  const [questions, setQuestions] = useState(d.questions)
  const [notice, setNotice] = useState("")
  const dirty =
    title !== d.title ||
    body !== d.body ||
    JSON.stringify(questions) !== JSON.stringify(d.questions)
  useUnsavedChanges(dirty)
  async function save(status: AiDraft["status"]) {
    await mutate({
      action: "draft.save",
      id: d.id,
      title,
      body,
      questions,
      status,
    })
    setNotice(`Content ${status}.`)
  }
  function move(index: number, delta: number) {
    setQuestions((old) => {
      const next = [...old]
      ;[next[index], next[index + delta]] = [next[index + delta], next[index]]
      return next
    })
  }
  return (
    <section className="space-y-4 rounded-xl border p-5">
      <h2 className="text-xl font-semibold">Review generated draft</h2>
      <p>
        Content lifecycle: <strong>{d.status}</strong> ·{" "}
        {dirty ? "Unsaved changes" : "Saved"}
      </p>
      <p>
        Sources:{" "}
        {d.sourceIds
          .map(
            (id) =>
              w.materials.find((m) => m.id === id)?.title ??
              "Source no longer available"
          )
          .join(", ") ||
          "No source files selected ? verify against your curriculum."}
      </p>
      <Label htmlFor="draft-title">Draft title</Label>
      <Input
        id="draft-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Label htmlFor="draft-content">Draft content</Label>
      <Textarea
        id="draft-content"
        rows={10}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {questions.map((q, index) => (
        <fieldset key={q.id} className="space-y-3 rounded-xl border p-4">
          <legend>Question {index + 1}</legend>
          <Label htmlFor={`question-${q.id}`}>Question</Label>
          <Textarea
            id={`question-${q.id}`}
            value={q.text}
            onChange={(e) =>
              setQuestions((old) =>
                old.map((x) =>
                  x.id === q.id ? { ...x, text: e.target.value } : x
                )
              )
            }
          />
          <Label htmlFor={`marks-${q.id}`}>Marks</Label>
          <Input
            id={`marks-${q.id}`}
            type="number"
            min={0.1}
            value={q.marks}
            onChange={(e) =>
              setQuestions((old) =>
                old.map((x) =>
                  x.id === q.id ? { ...x, marks: Number(e.target.value) } : x
                )
              )
            }
          />
          <Label htmlFor={`answer-${q.id}`}>
            Model answer / marking guidance
          </Label>
          <Textarea
            id={`answer-${q.id}`}
            value={q.answer}
            onChange={(e) =>
              setQuestions((old) =>
                old.map((x) =>
                  x.id === q.id ? { ...x, answer: e.target.value } : x
                )
              )
            }
          />
          <p>Difficulty: {q.difficulty}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              Move question up
            </Button>
            <Button
              variant="outline"
              disabled={index === questions.length - 1}
              onClick={() => move(index, 1)}
            >
              Move question down
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setQuestions((old) => old.filter((x) => x.id !== q.id))
              }
            >
              Delete question
            </Button>
          </div>
        </fieldset>
      ))}
      <p>Total question marks: {questions.reduce((n, q) => n + q.marks, 0)}</p>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={busy || w.mode !== "demo"}
          onClick={() => save("draft").catch(() => {})}
        >
          Save draft
        </Button>
        <ConfirmAction
          label="Approve review"
          description="Confirm you have verified accuracy, source references and marking guidance. This does not publish the content."
          disabled={busy || w.mode !== "demo"}
          onConfirm={() => save("reviewed")}
        />
        <ConfirmAction
          label="Publish reviewed content"
          description="Make this reviewed content visible to the selected class?"
          disabled={
            busy || w.mode !== "demo" || d.status !== "reviewed" || dirty
          }
          onConfirm={() => save("published")}
        />
        <ConfirmAction
          label="Reject and archive"
          description="Archive this draft without publishing?"
          disabled={busy || w.mode !== "demo"}
          onConfirm={() => save("archived")}
        />
        <Button
          disabled={
            busy ||
            w.mode !== "demo" ||
            !["reviewed", "published"].includes(d.status) ||
            dirty
          }
          onClick={() =>
            mutate({ action: "draft.convert", id: d.id })
              .then(() =>
                setNotice(
                  "Converted to an ordinary assignment draft. Open Assignments to add its deadline and publish it."
                )
              )
              .catch(() => {})
          }
        >
          Convert to assignment draft
        </Button>
      </div>
      {notice && <p role="status">{notice}</p>}
    </section>
  )
}
