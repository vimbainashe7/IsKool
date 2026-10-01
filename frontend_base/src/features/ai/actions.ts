"use server"

import { getCurrentSession } from "@/features/context/get-current-session"
import { getTeacherAiProvider } from "@/server/ai"
import type { TeacherAiTool } from "@/server/ai/provider"

export type TeacherAiActionState = {
  draft?: {
    title: string
    body: string
    status: "draft"
    providerMode: "mock" | "configured"
    createdAt: string
  }
  error?: string
}

const tools = new Set<TeacherAiTool>(["compile-notes", "create-test", "create-assignment"])

export async function generateTeacherAiDraft(
  _previousState: TeacherAiActionState,
  formData: FormData
): Promise<TeacherAiActionState> {
  const tool = formData.get("tool") as TeacherAiTool | null
  const prompt = String(formData.get("prompt") ?? "").trim()

  if (!tool || !tools.has(tool)) {
    return { error: "Choose a valid AI tool." }
  }

  if (!prompt) {
    return { error: "Add a topic, syllabus objective, or instruction first." }
  }

  const session = await getCurrentSession()
  if (!session) {
    return { error: "Sign in or use the local demo preview before generating drafts." }
  }

  if (session.context.activeRole !== "teacher" && session.context.activeRole !== "admin") {
    return { error: "Only teacher or admin contexts can generate teaching drafts." }
  }

  try {
    const provider = getTeacherAiProvider()
    const draft = await provider.generateDraft({
      tool,
      prompt,
      schoolId: session.context.school.id,
      requestedBy: session.context.user.id,
    })

    return {
      draft: {
        ...draft,
        providerMode: process.env.AI_PROVIDER === "mock" || process.env.NODE_ENV !== "production" ? "mock" : "configured",
        createdAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "AI generation failed.",
    }
  }
}
