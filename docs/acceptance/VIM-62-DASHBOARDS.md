# VIM-62 ? authoritative dashboard increment

Depends on merged VIM-51, VIM-52 and VIM-71. This increment does not close all of VIM-62; remaining academic capabilities depend on VIM-53 and later milestones.

## Owner test

```powershell
cd C:\Users\User\Documents\aiDo\IsKool_unified
npm run dev:iskool
notepad .\Passwords.txt
```

Open http://127.0.0.1:3000/sign-in. Preserve the existing school name/logo and account credentials.

1. Student Alpha dashboard: verify enrolled classes, academic year and current term, open a class, return and reload. View all opens the existing paginated Classes screen.
2. Teacher Alpha dashboard: verify assigned classes, current periods and each class's active student count. Counts describe student records, including students without sign-in accounts.
3. Admin: create a student and enroll it in a current term of a class assigned to Teacher Alpha. Return to the Admin dashboard and reload: registry and enrolled-student totals increase. Reload Teacher Alpha's dashboard: that class count increases.
4. Admin: withdraw that enrollment. Reload Admin and Teacher dashboards: enrolled counts decrease; student identity/history remain.
5. Unsupported assignment, submission, grading, materials, notification and timetable sections show unavailable. They must not claim zero work or successful loading. Failed class queries show a recoverable workspace error.

## Verification

- Frontend `pnpm test`: 154 passed locally, including response identity validation, genuine zero versus failure, bounded projections and live dashboard rendering. Loader and component regressions failed before implementation.
- Frontend lint/typecheck passed locally; CI runs the complete frontend and existing architecture/security gates.
- `npm run smoke:dashboards`: one worker, real browser ? Next.js ? APS/private SAMS ? restricted PostgreSQL. Requires the linked Student and active Teacher/current-term setup established by VIM-52. Creates an editable synthetic student and retains withdrawn enrollment history. Traces off and existing redacted reporting; do not publish private local logs.
- Real browser result and final exact-head CI evidence are recorded on this increment's PR. Human acceptance and merge approval are separate gates.

No migration, database grants, dependencies or new backend routes. Existing `/api/v1/academic-context` validates the actor, school and role through SAMS. The server loader validates the typed response again and requests a preview limit of three with an authoritative full class count. It never derives Teacher counts from missing membership rows. Existing Admin `/api/v1/student-administration/summary` remains the registry authority.
