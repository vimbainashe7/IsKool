# Frontend Architecture - IsKool

## Product Model

IsKool is one shared Next.js app with role-specific dashboards for students, teachers, and admins. Roles are UX context and capability composition; database access is authorized by Supabase Auth, membership tables, and PostgreSQL RLS.

```text
Supabase Auth user -> profile -> school_membership -> membership_roles -> active role dashboard
```

## Current App Root

The runnable app lives at `frontend_base`. This pass keeps that root intact and uses pnpm as the package manager.

## Core Boundaries

- `src/app`: App Router routes, including `/student/dashboard`, `/teacher/dashboard`, `/admin/dashboard`, auth pages, and protected dashboard layout.
- `src/lib/supabase`: browser client, server client, and Next 16 `proxy.ts` session refresh helper.
- `src/features/context`: server session resolver and role switcher contract.
- `src/features/dashboards`: role dashboard UI plus live-query data adapters.
- `src/features/storage`: private Storage upload path builders and upload components.
- `src/server/ai`: server-side AI provider boundary.
- `supabase/migrations`: database schema, RLS, helper functions, and Storage bucket policies.

## Auth And Session

`src/proxy.ts` refreshes Supabase sessions through `@supabase/ssr`. Protected app routes redirect unauthenticated users to `/sign-in?next=...`. Public auth routes are `/sign-in`, `/sign-up`, `/forgot-password`, `/update-password`, `/auth/confirm`, and `/logout`.

`getCurrentSession()` resolves the current user from Supabase Auth, then loads `profiles`, `school_memberships`, and `membership_roles`. The frontend does not use `profiles.role` and does not let the browser self-assign admin.

## Role Dashboards

- `/student/dashboard`: classes, due/overdue work, grades, feedback, resources, timetable.
- `/teacher/dashboard`: own classes, materials, assignments, submissions, grading foundation, AI entry.
- `/admin/dashboard`: users, memberships/roles, classes, enrollments, audit foundation.
- `/home`: redirects to the active role dashboard.

The role switcher stores `iskool-active-role` as UI context only. RLS remains authoritative for data.

## Data Fetching

Server Components are the default for reads. Dashboard data adapters use Supabase queries through RLS and fall back to clearly labeled fixture data only when Supabase is unconfigured or a query fails during local frontend work.

## Security Model

Navigation filtering is not security. The database migration enables RLS on all exposed public tables and uses private helper functions for school membership, role checks, teacher-class checks, and student-class checks.

Private Storage buckets are `assignment-submissions` and `teacher-materials`. Object paths include school/class/assignment/user path segments plus a generated UUID; original filenames are kept as metadata/table fields, not trusted object keys.

## AI Workspace

Teacher AI tools are Compile Notes, Create Test, and Create Assignment. The provider abstraction is server-side; no AI API key is read by client components. Generated content is modeled as draft/review/publish data through `ai_jobs` and `generated_content`.
