"use client"

import * as React from "react"
import { useActionState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, Clipboard, FileQuestion, NotebookPen, WandSparkles } from "lucide-react"

import { generateTeacherAiDraft, type TeacherAiActionState } from "@/features/ai/actions"
import { TeacherUploadAutoProcessingView } from "@/features/teacher/teacher-upload-auto-processing-view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageShell } from "@/components/page-shell"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { TeacherAiTool } from "@/server/ai/provider"

const tools: {
  key: TeacherAiTool
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  placeholder: string
}[] = [
  {
    key: "compile-notes",
    title: "Compile Notes",
    description: "Draft teaching notes from syllabus scope, class level, and uploaded references.",
    icon: NotebookPen,
    placeholder: "Example: Form 3 algebra, simultaneous equations, include two worked examples",
  },
  {
    key: "create-test",
    title: "Create Exam Questions",
    description: "Draft exam or revision questions, marking guides, and difficulty balance for teacher review.",
    icon: FileQuestion,
    placeholder: "Example: Form 2 Biology, cells and microscopes, 30 marks, include a marking guide",
  },
  {
    key: "create-assignment",
    title: "Create Assignment",
    description: "Draft assignment instructions, rubric, due window, and support material.",
    icon: WandSparkles,
    placeholder: "Example: Geography weather instruments, one-week homework assignment",
  },
]

const initialState: TeacherAiActionState = {}

export function TeacherAiWorkspace() {
  const [state, formAction, isPending] = useActionState(generateTeacherAiDraft, initialState)
  const [copied, setCopied] = React.useState(false)
  const searchParams = useSearchParams()
  const selectedTool = searchParams.get("tool")

  async function copyDraft() {
    if (!state.draft) return

    await navigator.clipboard.writeText(`${state.draft.title}\n\n${state.draft.body}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <PageShell
      eyebrow="Draft and review"
      title="Teacher AI Workspace"
      description="Generate notes, tests, and assignments as reviewable drafts before publishing to students."
      icon={WandSparkles}
    >

      {state.error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon
          const isSelected = selectedTool === tool.key
          return (
            <Card
              key={tool.title}
              className={
                isSelected
                  ? "overflow-hidden border-iskool-blue bg-iskool-cream/50 py-0 ring-2 ring-iskool-blue/20"
                  : "overflow-hidden py-0"
              }
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="size-5 text-primary" />
                  <CardTitle className="text-base">{tool.title}</CardTitle>
                </div>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <form action={formAction} className="grid gap-3">
                  <input type="hidden" name="tool" value={tool.key} />
                  <div className="grid gap-2">
                    <Label htmlFor={`${tool.key}-prompt`}>Topic or instruction</Label>
                    <Textarea
                      id={`${tool.key}-prompt`}
                      name="prompt"
                      placeholder={tool.placeholder}
                      className="min-h-28 resize-none"
                      defaultValue={isSelected ? tool.placeholder.replace("Example: ", "") : ""}
                      required
                    />
                  </div>
                  <Button variant="outline" className="h-10 w-full rounded-xl" disabled={isPending}>
                    {isPending ? "Generating..." : `Generate ${tool.title.toLowerCase()}`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Generated draft</CardTitle>
            <CardDescription>
              Review, adjust, then later publish through the backend workflow.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={copyDraft} disabled={!state.draft}>
            {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </CardHeader>
        <CardContent className="pb-6">
          {state.draft ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{state.draft.status}</Badge>
                <Badge variant="outline">{state.draft.providerMode} provider</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(state.draft.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="rounded-xl border border-iskool-cream bg-iskool-cream/30 p-4">
                <h2 className="text-lg font-semibold">{state.draft.title}</h2>
                <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-6 text-muted-foreground">
                  {state.draft.body}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Choose a tool, enter a topic, and generate a draft. Local development uses a deterministic mock generator until a real provider is configured.
            </p>
          )}
        </CardContent>
      </Card>

      <TeacherUploadAutoProcessingView />
    </PageShell>
  )
}
