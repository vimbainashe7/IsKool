"use client"

import { useActionState } from "react"
import { BookOpen, ClipboardCheck, FileUp, Loader2, Sparkles } from "lucide-react"

import { processTeacherNotesAction, type AutomationActionState } from "@/features/automation/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const initialState: AutomationActionState = {}

function SubmitButton() {
  return (
    <Button className="w-full bg-iskool-navy text-iskool-cream hover:bg-iskool-midnight" type="submit">
      <Sparkles />
      Generate module draft
    </Button>
  )
}

export function TeacherUploadAutoProcessingView() {
  const [state, formAction, pending] = useActionState(processTeacherNotesAction, initialState)

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="border-iskool-cream bg-white">
        <CardHeader>
          <Badge className="w-fit bg-iskool-cream text-iskool-navy hover:bg-iskool-cream">Teacher AI</Badge>
          <CardTitle className="text-3xl text-iskool-midnight">Upload notes and auto-build a module</CardTitle>
          <CardDescription>
            Paste lesson notes, handout text, or transcript content. IsKool drafts key takeaways, flashcards, and revision questions for teacher review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" placeholder="Mathematics" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gradeLevel">Level</Label>
                <Input id="gradeLevel" name="gradeLevel" placeholder="Form 4" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="classId">Class ID</Label>
                <Input id="classId" name="classId" placeholder="Optional while backend syncs" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rawNotes">Teacher notes</Label>
              <Textarea
                className="min-h-64 resize-y"
                id="rawNotes"
                name="rawNotes"
                placeholder="Paste lesson notes here. Include examples, formulas, vocabulary, and any learner misconceptions you want the AI to handle."
                required
              />
            </div>
            <SubmitButton />
            {pending ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Generating a reviewable module draft...
              </p>
            ) : null}
            {state.message ? (
              <p className={state.ok ? "text-sm text-iskool-midnight" : "text-sm text-destructive"}>{state.message}</p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {[
          { icon: BookOpen, title: "Structured notes", text: "Clean summaries and learner-ready explanations stay in draft until the teacher approves." },
          { icon: FileUp, title: "Revision pack", text: "Flashcards and quiz items are generated together so students can revise from the same source." },
          { icon: ClipboardCheck, title: "Backend contract", text: "Drafts persist in ai_module_drafts and can later publish into materials, tests, or assignments." },
        ].map((item) => (
          <Card className="border-iskool-cream bg-iskool-cream/35" key={item.title}>
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-iskool-navy text-iskool-cream">
                <item.icon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-iskool-midnight">{item.title}</CardTitle>
                <CardDescription>{item.text}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
