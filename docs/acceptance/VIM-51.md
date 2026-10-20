# VIM-51 student administration acceptance

Use the canonical `C:\Users\User\Documents\aiDo\IsKool_unified` checkout. This is development-only. Configure ignored service/frontend environment files as described in the root README; apply reviewed canonical migrations through the normal migration process. Startup and smoke never migrate or seed. Existing deterministic fixtures provide School Alpha/Beta and Admin/Registrar/Teacher/Student identities. Do not reseed after credential rotation without an explicit maintenance decision.

```powershell
Set-Location C:\Users\User\Documents\aiDo\IsKool_unified
npm run dev:iskool
```

Open http://127.0.0.1:3000/sign-in. Select Admin and use the privately supplied rotated development password. Open **Students**.

1. Expand Academic setup and create a year, a term within that year, and a class for that year. Save each; errors must be visible.
2. Create a student with a unique admission number. The real list must show the new record. Open record.
3. Create a guardian, select it under Existing guardian, choose a relationship and link. A guardian may legitimately be linked to multiple students in the same school.
4. Choose the matching class and term, select Active and enroll. Reload: the guardian and active enrollment remain.
5. Change the given name and save. Reload: the change remains.
6. Choose Withdrawn under New enrollment status, save and reload. The historical row remains Withdrawn. Reentry requires a new enrollment.
7. Sign out. Repeat Teacher/Student sign-in: privileged student operations must be denied. The automated smoke separately verifies Beta records cannot be read/updated by Alpha Admin. Restricted-role SQL tests verify disabled membership denial without modifying shared hosted fixtures.

Expected API failures: 401 invalid/missing credentials or scope; 403 forbidden role/origin; 404 inaccessible or absent school record; 409 duplicate identifier/open enrollment or stale version; 422 invalid period/class/lifecycle. A dependency outage returns a clear retryable error; it is not an empty list or successful save. Refresh/reload after recovery. Do not resubmit a mutation blindly if the response was lost: inspect persisted state first.

Run the committed live browser smoke from a second root terminal after readiness:

```powershell
npm run smoke:vim-51
```

It loads `DEV_SEED_PASSWORD` privately from ignored local files, uses one Chromium worker, and exits nonzero on any failure. It creates uniquely named development records; it never deletes them or applies migrations. Two tests cover the real Admin journey/persistence and school/role denials. Traces are disabled; reports/screenshots stay ignored and are redacted. Do not publish raw reports. Docker-free startup uses Node 22 backend and Node 24 frontend as resolved by the launcher. The smoke itself can run with Node 22.

Interactive API: http://127.0.0.1:3002/api/v1/docs. Contracts and route/error details: [STUDENT_ADMINISTRATION.md](../contracts/STUDENT_ADMINISTRATION.md). A registrar can perform the API journey; the first UI journey uses the existing Admin workspace. No registrar-specific frontend is claimed.

Example PowerShell API session (keep the terminal private; never print `$session` or `$headers`):

```powershell
$secure = Read-Host 'Rotated development fixture password' -AsSecureString
$credential = [System.Net.NetworkCredential]::new('', $secure)
$session = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3002/api/v1/auth/login' -ContentType 'application/json' -Body (@{email='registrar.alpha@example.test';password=$credential.Password} | ConvertTo-Json)
$headers = @{Authorization=('Bearer ' + $session.accessTokens.sams)}
$student = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3002/api/v1/students' -Headers $headers -ContentType 'application/json' -Body (@{admissionNumber=('MANUAL-' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds());givenName='Manual';familyName='Learner'} | ConvertTo-Json)
$read = Invoke-RestMethod -Uri ('http://127.0.0.1:3002/api/v1/students/' + $student.id) -Headers $headers
$updated = Invoke-RestMethod -Method Patch -Uri ('http://127.0.0.1:3002/api/v1/students/' + $student.id) -Headers $headers -ContentType 'application/json' -Body (@{version=$read.version;givenName='Manual updated'} | ConvertTo-Json)
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3002/api/v1/auth/logout' -Headers $headers | Out-Null
Remove-Variable secure,credential,session,headers,student,read,updated
```

For guardian and enrollment use the UI steps above or the documented POST contracts with IDs returned by your school context; never copy another school's UUID. Tenant identity is server-derived.

Read-only PostgreSQL inspection in the approved development maintenance session (replace UUID literals with IDs returned by your own acceptance run):

```sql
SELECT id, admission_number, given_name, status, version FROM public.students WHERE id = 'your-student-uuid'::uuid;
SELECT student_id, guardian_id, relationship FROM public.student_guardians WHERE student_id = 'your-student-uuid'::uuid;
SELECT id, student_id, class_id, academic_term_id, status, version, enrolled_at, ended_at FROM public.enrollments WHERE student_id = 'your-student-uuid'::uuid;
SELECT action, entity_type, entity_id, created_at FROM public.audit_events WHERE entity_id IN ('your-student-uuid', 'your-guardian-uuid', 'your-enrollment-uuid') ORDER BY created_at;
```

Expect student.created, guardian.created, student.guardian_linked, enrollment.created, student.updated and enrollment.status_changed. Audit reads here are maintenance inspection, not evidence of runtime isolation: `npm run db:master-data:test` uses actual restricted login roles against a disposable replay database. Never point destructive fixture/replay tests at hosted Supabase. No general cleanup/delete is provided; history is retained. Use archival only after closing open enrollments.

Owner accepted the capability and approved merge on 2026-10-20; PR #6 merged as `81c7c15`. Automated success, CI verification, merge, human acceptance and release are tracked separately in [PRODUCT_DELIVERY.md](../progress/PRODUCT_DELIVERY.md).
