# Route/capability matrix

One application and one login. `/home` resolves the validated active context. Role preference cookies never grant authorization. Shared aliases resolve to the current role route. Server capability checks run in every data endpoint as well as each workspace page; database RLS must independently enforce tenant and resource ownership.

| Entry | Actor | Capability | Backend dependency |
| --- | --- | --- | --- |
| `/sign-in` | All | `home.view` | VIM-49 |
| `/logout` | All | `home.view` | VIM-49 |
| `/forgot-password` | All | `public` | Supabase email configuration |
| `/update-password` | All | `public` | Supabase email configuration |
| `Protected routes` | All | `home.view` | VIM-49 |
| `Header context switcher` | All | `home.view` | VIM-49 |
| `/student/dashboard` | Student | `dashboard.student` | VIM-52 |
| `/student/classes` | Student | `classes.view` | VIM-51,52 |
| `/student/assignments/[assignmentId]` | Student | `assignments.submit` | VIM-53,59 |
| `/student/grades` | Student | `grades.view_own` | VIM-54 |
| `/student/notes` | Student | `materials.view` | VIM-55,59 |
| `/student/timetable` | Student | `timetable.view` | VIM-52 |
| `/teacher/dashboard` | Teacher | `dashboard.teacher` | VIM-52 |
| `/teacher/classes` | Teacher | `classes.view` | VIM-51,52 |
| `/teacher/assignments/new` | Teacher | `assignments.manage` | VIM-53,59 |
| `/teacher/materials` | Teacher | `materials.manage` | VIM-55,59 |
| `/teacher/submissions` | Teacher | `submissions.review` | VIM-53,54,59 |
| `/teacher/gradebook` | Teacher | `grades.manage` | VIM-54 |
| `/teacher/ai?tool=compile-notes` | Teacher | `ai.use` | VIM-55,59,60 |
| `/teacher/ai?tool=create-test` | Teacher | `ai.use` | VIM-55,59,60 |
| `/teacher/ai?tool=create-assignment` | Teacher | `ai.use` | VIM-53,55,59,60 |
| `/admin/dashboard` | Admin | `dashboard.admin` | VIM-49,51,52 |
| `/admin/users` | Admin | `users.manage` | VIM-49,51 |
| `/admin/students` | Admin | `students.manage` | VIM-51 |
| `/admin/teachers` | Admin | `users.manage` | VIM-49,51 |
| `/admin/classes` | Admin | `classes.manage` | VIM-51 |
| `/admin/enrollments` | Admin | `enrollments.manage` | VIM-51 |
| `/admin/roles` | Admin | `roles.manage` | VIM-49 |
| `/admin/audit` | Admin | `audit.view` | VIM-49,52 |
| `/notifications` | All | `notifications.view` | VIM-52 |
| `/search and Ctrl/Cmd+K` | All | `search.use` | VIM-52 |
| `error.tsx` | All | `home.view` | VIM-52 |
| `Protected role and resource routes` | All | `server capability` | VIM-49 |

Additional routes: `/teacher/question-bank`, `/teacher/assessments` (VIM-55), `/admin/attendance` (VIM-51/52), `/admin/finance`, `/admin/staff`, `/admin/reports`, `/admin/settings` (operations contracts not present). Published material/student grades never use the teacher draft query. Notifications and search are shared authorized reads. `/help` documents support. `/reset-password` aliases `/update-password`; `/auth/callback` exchanges recovery code.

Starter routes /tasks, /users, /mail, /chat, /calendar, /pricing, /dashboard-2 remain removed. Retained pricing component is unused. Billing/connections template screens are removed from public navigation and redirect to account.
