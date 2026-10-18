# Student administration (first SAMS master-data slice)

SAMS is authoritative for `students`, `guardians`, `student_guardians`, `academic_years`, `academic_terms`, `classes` and `enrollments`. APS receives no grants on these tables. `SchoolClass` is the Prisma name for SQL `classes`; no duplicate class structure is introduced.

All routes below are under `/api/v1`, require a SAMS bearer token, revalidate the membership through `ServiceAuthGuard`, and then require admin or registrar authority. The school comes exclusively from the validated principal. Request bodies containing `schoolId`, actor IDs or roles are rejected by the existing global validation pipe. Teacher and Student cannot use these privileged routes.

| Method | Route | Behavior |
| --- | --- | --- |
| GET / POST | `/students` | Keyset list (default 25, maximum 50) / create student with normalized unique admission number |
| GET / PATCH | `/students/:id` | School-scoped detail / allowed names and archival status; expected `version` required |
| GET / POST | `/guardians` | Bounded keyset list / create unique school/email contact |
| POST | `/students/:id/guardians` | Link a same-school guardian with `parent`, `guardian` or `other` relationship |
| POST | `/students/:id/enrollments` | Same-school active student, class and term; class/term must share the year; server creates timestamps |
| GET | `/student-administration/context` | Bounded year/term/class setup options (100 each; explicit truncation flag) |
| POST | `/student-administration/academic-years` | Create calendar year with consistent dates |
| POST | `/student-administration/academic-terms` | Create term within its school year |
| POST | `/student-administration/classes` | Create school class within its year |
| PATCH | `/student-administration/enrollments/:id` | Version-checked lifecycle transition |

The frontend uses a route allowlist at `/api/sams/[...path]`. Tokens stay in HttpOnly cookies; mutation requests require the same origin, bounded JSON bodies, and a propagated server request ID. There is no demo or fixture fallback if SAMS is unavailable. Runtime response schemas live in `frontend_base/src/features/students/contracts.ts`.

Every mutation and its audit event share the principal-scoped Prisma transaction. Duplicate identifiers/open enrollments return 409. Stale versions return 409 and ask the user to reload. Missing/inaccessible related school records return 404. Invalid academic context or lifecycle returns 422. Validation failures use the existing API error envelope; the frontend presents useful messages without provider details.

Enrollment transitions: `pending -> active|cancelled`; `active -> withdrawn|transferred|completed`. Closed rows cannot be revived. Reentry creates a new row. A partial unique index prevents multiple pending/active records for the same student/class/term. Composite foreign keys protect school and year consistency. Database triggers enforce term date containment, immutable enrollment context, lifecycle/version advancement, and serialization of student archival with enrollment creation. A forward-only privilege migration also removes provider default grants, including any TRUNCATE privilege (which bypasses RLS), and reinstates only the intended SAMS grants. No destructive deletion route/privilege is added.

Student detail returns at most 50 guardian relationships and 50 recent enrollments. Setup options are bounded to 100 per type. Full historical browsing and larger-school setup filtering remain follow-up scalability work; this slice does not claim the remaining dashboards or academic journey are implemented. Teacher/staff profiles and student sign-in account association remain separate domain work. Registrar authority is supported in the API; the existing frontend still provides the Admin workspace for this initial UI journey.

Sources used to verify framework behavior: [PostgreSQL 17 row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [Prisma transactions](https://www.prisma.io/docs/orm/fundamentals/transactions), [NestJS validation](https://docs.nestjs.com/techniques/validation), [Next.js route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route).
