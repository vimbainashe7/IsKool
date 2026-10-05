# AI Workspace

## Tools

Teacher AI has three phase-one tools:

- Compile Notes
- Create Test
- Create Assignment

## Data Model

AI requests persist to `ai_jobs`. Generated output persists to `generated_content` with a draft/review/publish lifecycle. Drafts must be reviewed before publishing to students.

## Secret Handling

No AI provider key is exposed to client components. Server-only configuration uses:

- `AI_PROVIDER`
- `AI_API_KEY`

`AI_PROVIDER=mock` enables the development-only mock provider. Any production provider must be implemented behind `src/server/ai/provider.ts`.

## Current Status

`/teacher/ai` has Compile Notes, Test Generator and Assignment Generator configuration, persisted development jobs, editable draft/question review, reorder/delete, review/approval, explicit publishing/archive and conversion to ordinary assignment drafts. Jobs and content have independent lifecycles. Returning or refreshing retains a preview job. Changed reviewed content requires another review before publication.

No production LLM/queue is connected: VIM-60 blocks execution, VIM-59 ingestion, and VIM-55 content publishing/question bank. Development output is clearly identified. The retained provider boundary refuses production mocks; no provider secret reaches browser code. Real cancellation/selected-section regeneration require backend support.
