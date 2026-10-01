# Route / Capability Matrix

Server authorization and PostgreSQL RLS remain authoritative. This matrix is the frontend composition map.

| Route | Actors | Capability | Data source |
| --- | --- | --- | --- |
| `/home` | authenticated users | `home.view` | redirects by active role |
| `/student/dashboard` | students | `dashboard.student` | Supabase queries with fixture fallback |
| `/teacher/dashboard` | teachers | `dashboard.teacher` | Supabase queries with fixture fallback |
| `/admin/dashboard` | admins | `dashboard.admin` | Supabase queries with fixture fallback |
| `/classes` | students, teachers, admins | `classes.view` | flow skeleton |
| `/assignments` | students, teachers | `assignments.view` | flow skeleton |
| `/student/assignments/[assignmentId]` | students | `assignments.submit` | private Storage upload |
| `/teacher/materials` | teachers | `assignments.manage` | private Storage upload |
| `/teacher/ai` | teachers | `assignments.manage` | AI workspace scaffold |
| `/grades` | students, teachers | `grades.view_own` / `grades.manage` | flow skeleton |
| `/admissions` | admins | `admissions.manage` | flow skeleton |
| `/students` | admins | `students.manage` | flow skeleton |
| `/attendance` | teachers, admins | `attendance.manage` | flow skeleton |
| `/finance` | admins | `finance.view`, `payments.record` | flow skeleton |
| `/staff` | admins | `staff.manage` | flow skeleton |
| `/reports` | admins | `reports.view` | flow skeleton |
| `/notifications` | authenticated users | `notifications.view` | flow skeleton |
| `/search` | authenticated users | `search.use` | command/search shell |
| `/settings/*` | authenticated users | `settings.manage` | retained settings screens |

Starter demo routes removed in this pass: `/tasks`, `/users`, `/mail`, `/chat`, `/calendar`, `/pricing`, `/dashboard-2`.
