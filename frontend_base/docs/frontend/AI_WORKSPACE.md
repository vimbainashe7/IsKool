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

`/teacher/ai` renders the role workspace and tool entry points. The server provider abstraction exists, but no production LLM provider is connected yet.
