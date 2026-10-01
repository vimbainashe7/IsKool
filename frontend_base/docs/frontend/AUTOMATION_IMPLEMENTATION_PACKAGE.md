# IsKool Automation Implementation Package

This package gives the backend a clean contract to follow while keeping the frontend role boundaries strict.

## Database

Apply `supabase/migrations/202609290001_iskool_auth_rls_foundation.sql` first, then `supabase/migrations/202610020001_iskool_automation_core.sql`.

The automation migration adds:

- `attendance_logs`
- `ai_module_drafts`
- `notification_events`
- `timetable_slots`
- school branding columns: `schools.logo_url`, `schools.brand_color`

RLS rules use the existing membership helpers:

- students can view only enrolled class learning material and their class attendance
- teachers can manage drafts and attendance for classes they teach
- admins can manage school-level operational records

## Next.js Server Actions

Core actions live in `src/features/automation/actions.ts`.

- `processTeacherNotesAction`: teacher-only AI notes to module draft
- `recordAttendanceAction`: teacher-only attendance write
- `queueReminderAction`: teacher/admin reminder queueing

The teacher action works in local development without an AI key by returning a deterministic draft. Production LLM calls require:

- `AI_MODEL`
- `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY`
- optional `AI_GATEWAY_URL`

## AI Engine

`src/server/ai/note-to-module-engine.ts` validates output with Zod and returns:

- title
- summary
- key takeaways
- flashcards
- revision quiz
- source text hash

AI output is always treated as draft content. Teachers publish after review.

## Portal Skeletons

- Teacher upload and auto-processing: `src/features/teacher/teacher-upload-auto-processing-view.tsx`
- Student smart feed: `src/features/student/student-smart-feed.tsx`
- Admin exception command dashboard: `src/features/admin/admin-exception-command-dashboard.tsx`

Role intent:

- students view, download, revise, submit
- teachers upload notes, create assignments, create tests, create revision tests, publish material
- admins manage school operations, timetable, reports, alerts, people, settings, and branding

## APS API

`aps-api/src/modules/automation` contains a NestJS automation module skeleton:

- `POST /automation/reminders`
- `POST /automation/timetable`
- `POST /automation/report-cards`

The service currently returns queued job contracts. Wire it to BullMQ workers when the APS worker layer is ready.
