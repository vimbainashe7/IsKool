# Critical User Flows - IsKool v1

## Auth

| Flow | Status | Notes |
| --- | --- | --- |
| Sign in | IMPLEMENTED | Supabase `signInWithPassword`; redirects to `next` or `/home`. |
| Sign out | IMPLEMENTED | `/logout` signs out on the server and redirects to `/sign-in`. |
| Signup / activation | PARTIAL | Supabase signup exists; invite validation/admin role assignment still backend work. |
| Forgot password | IMPLEMENTED | Uses `resetPasswordForEmail`. |
| Reset password | IMPLEMENTED | `/update-password` calls `updateUser({ password })`. |
| Session refresh | IMPLEMENTED | Next 16 `proxy.ts` uses `@supabase/ssr`. |
| Route protection | IMPLEMENTED | Protected routes redirect unauthenticated users to sign-in. |
| Multi-role switching | PARTIAL | UI role cookie and redirects implemented; server endpoint/audit still pending. |

## Role Dashboards

| Flow | Status | Notes |
| --- | --- | --- |
| Student dashboard | PARTIAL | Live Supabase query adapter plus fixture fallback. |
| Teacher dashboard | PARTIAL | Live Supabase query adapter plus fixture fallback. |
| Admin dashboard | PARTIAL | Live Supabase query adapter plus fixture fallback. |
| Student assignment submission | PARTIAL | Private Storage upload path implemented; submission DB insert pending. |
| Teacher materials upload | PARTIAL | Private Storage upload path implemented; material DB insert pending. |
| Teacher AI | PARTIAL | Workspace and provider abstraction exist; production provider/action pending. |
| User + role management | PARTIAL | RLS schema supports it; admin UI remains skeleton. |
| Audit foundation | PARTIAL | `audit_logs` exists; application event writers pending. |

## Product Skeletons

Classes, assignments, grades, admissions, students, attendance, finance, staff, reports, notifications, and search remain structured frontend skeletons awaiting backend contracts.
