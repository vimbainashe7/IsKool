import { createHash } from "node:crypto"
import { z } from "zod"

const flashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
})

const quizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  answer: z.string().min(1),
  explanation: z.string().min(1),
})

export const learningModuleSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  keyTakeaways: z.array(z.string().min(1)).min(3).max(10),
  flashcards: z.array(flashcardSchema).min(3).max(20),
  revisionQuiz: z.array(quizQuestionSchema).min(3).max(20),
})

export type LearningModuleDraft = z.infer<typeof learningModuleSchema> & {
  sourceTextHash: string
  providerMode: "configured" | "deterministic-fallback"
}

type GenerateModuleInput = {
  rawNotes: string
  subject?: string
  gradeLevel?: string
  language?: string
}

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function deterministicFallback(input: GenerateModuleInput): LearningModuleDraft {
  const topic = input.subject || "Uploaded Notes"
  const grade = input.gradeLevel ? ` for ${input.gradeLevel}` : ""
  const sample = input.rawNotes.slice(0, 180).replace(/\s+/g, " ").trim()

  return {
    title: `${topic} Module${grade}`,
    summary: sample || "Teacher notes converted into a structured learning module.",
    keyTakeaways: [
      `Understand the main ideas in ${topic}.`,
      "Identify important definitions, examples, and steps.",
      "Practice recall using flashcards and revision questions.",
    ],
    flashcards: [
      { front: `What is the main focus of ${topic}?`, back: sample || "Review the uploaded teacher notes." },
      { front: "What should learners revise first?", back: "Definitions, examples, and teacher-highlighted steps." },
      { front: "How should learners test themselves?", back: "Use flashcards, then answer revision quiz questions without notes." },
    ],
    revisionQuiz: [
      {
        question: `Which activity best helps revise ${topic}?`,
        options: ["Ignoring notes", "Using flashcards", "Skipping examples", "Only reading once"],
        answer: "Using flashcards",
        explanation: "Flashcards force active recall, which is better than passive rereading.",
      },
      {
        question: "What should a learner do after missing a quiz question?",
        options: ["Move on forever", "Review the explanation", "Delete the module", "Guess again only"],
        answer: "Review the explanation",
        explanation: "Explanations close knowledge gaps and support correction.",
      },
      {
        question: "Who must approve generated learning material before publishing?",
        options: ["The teacher", "Any student", "No one", "A browser extension"],
        answer: "The teacher",
        explanation: "AI output is a draft. Teacher approval protects quality and accuracy.",
      },
    ],
    sourceTextHash: hashText(input.rawNotes),
    providerMode: "deterministic-fallback",
  }
}

function extractJson(text: string) {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM response did not contain a JSON object.")
  }

  return JSON.parse(text.slice(start, end + 1)) as unknown
}

export async function generateLearningModuleFromNotes(
  input: GenerateModuleInput
): Promise<LearningModuleDraft> {
  const rawNotes = input.rawNotes.trim()

  if (rawNotes.length < 40) {
    throw new Error("Upload or paste at least 40 characters of notes before generating a module.")
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY
  const endpoint = process.env.AI_GATEWAY_URL || "https://api.openai.com/v1/chat/completions"
  const model = process.env.AI_MODEL

  if (!apiKey || !model) {
    return deterministicFallback({ ...input, rawNotes })
  }

  const prompt = [
    "You are IsKool's teacher assistant. Convert teacher notes into a student-ready learning module.",
    "Return only valid JSON with this shape:",
    "{ title, summary, keyTakeaways: string[], flashcards: {front, back}[], revisionQuiz: {question, options, answer, explanation}[] }",
    "The teacher will review before publishing. Do not invent school policy. Keep language age-appropriate.",
    `Subject: ${input.subject || "unspecified"}`,
    `Grade level: ${input.gradeLevel || "unspecified"}`,
    `Language: ${input.language || "English"}`,
    `Raw notes:\n${rawNotes}`,
  ].join("\n\n")

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You produce strict JSON for school learning material." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    throw new Error(`AI provider failed with ${response.status}.`)
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = payload.choices?.[0]?.message?.content

  if (!content) {
    throw new Error("AI provider returned an empty response.")
  }

  const parsed = learningModuleSchema.parse(extractJson(content))

  return {
    ...parsed,
    sourceTextHash: hashText(rawNotes),
    providerMode: "configured",
  }
}
