# Auth And RLS

## Implemented Frontend Boundary

- Supabase packages: `@supabase/supabase-js` and `@supabase/ssr`.
- Browser client: `src/lib/supabase/client.ts`.
- Server client: `src/lib/supabase/server.ts`.
- Session refresh: `src/lib/supabase/proxy.ts` called from Next 16 `src/proxy.ts`.
- Auth routes: `/sign-in`, `/sign-up`, `/forgot-password`, `/update-password`, `/logout`, `/auth/confirm`.

## Identity Model

Roles are normalized in `membership_roles.role_key` with phase keys:

- `student`
- `teacher`
- `admin`

`profiles` is for identity details only. It does not contain an authorization role.

## RLS Helper Functions

The migration creates helper functions in the private schema:

- `private.is_school_member(school_id)`
- `private.has_school_role(school_id, role_key)`
- `private.is_teacher_of_class(class_id)`
- `private.is_student_in_class(class_id)`

Functions use `SECURITY DEFINER`, fixed `search_path`, and `auth.uid()` predicates. The private schema is not an exposed API schema.

## RLS Matrix

| Table | Student | Teacher | Admin |
| --- | --- | --- | --- |
| `schools` | own school select | own school select | own school select |
| `profiles` | own profile | own profile | own profile |
| `school_memberships` | school scoped select | school scoped select | manage school memberships |
| `membership_roles` | school scoped select | school scoped select | manage role rows |
| `classes` | school scoped select | school scoped select | manage classes |
| `class_teachers` | school scoped select | school scoped select | manage teacher links |
| `class_enrollments` | own class participation | class participation | manage enrollments |
| `assignments` | published assignments in enrolled classes | manage taught class assignments | manage school assignments |
| `submissions` | own submissions | taught class submissions | school submissions |
| `materials` | published enrolled-class materials | manage taught class materials | manage school materials |
| `grades` | own published grades | manage taught class grades | manage school grades |
| `ai_jobs` | none | manage teacher jobs | manage school jobs |
| `generated_content` | none until published through product flow | draft/review teacher content | manage school generated content |
| `audit_logs` | none | insert events through product flow | view audit logs |

## Backend Notes

New Supabase projects may require explicit Data API exposure/grants depending on project settings. RLS is enabled in the blueprint, but existing ownership gaps mean the blueprint is not ready for production ingestion.

## Completion pass verification limits

Callbacks check code/OTP failures and same-origin return paths. Password updates require matching confirmation. Logout and role switching use same-origin POST; role switching validates membership and uses full navigation to discard context caches. Refresh cookies survive redirects. Inactive memberships reach a generic permission screen.

Live Auth requires a configured Supabase project, email/redirect configuration and provisioned fixtures. No such environment is available in this session. Mocked integration and preview E2E do not prove live Auth or deployed RLS. Existing policies allow school-wide private file/classes and teacher-wide AI drafts; child records need composite tenant checks. VIM-49/VIM-59 must fix these. Disabled frontend writes/files do not fix direct database access. The rollback-only RLS suite must run independently on isolated local Supabase.

References checked 2026-10-04: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [Next.js proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy).
