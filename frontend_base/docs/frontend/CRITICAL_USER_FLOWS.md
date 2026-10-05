# Critical user flows ? IsKool

Ratified frontend behavior for the supplied execution brief, 2026-10-04. Implementation evidence is tracked separately in FRONTEND_COMPLETION_MATRIX.md. Documentation does not claim live backend completion.

Actors: Student, Teacher, Admin. Registrar, Finance, HR and Leadership are reserved extension points: add trusted database roles and explicit capability grants before exposing their navigation. Existing schema supports only the first three.

## Sign in

- Actor: All. Goal: complete sign in safely. Entry: `/sign-in`.
- Prerequisites: Verified Supabase identity and active school membership.
- Happy path: Credentials ? validated session ? /home ? active dashboard.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `home.view`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-49. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Sign out

- Actor: All. Goal: complete sign out safely. Entry: `/logout`.
- Prerequisites: Authenticated identity.
- Happy path: POST logout ? revoke session ? clear context ? sign-in.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `home.view`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-49. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Forgot password

- Actor: All. Goal: complete forgot password safely. Entry: `/forgot-password`.
- Prerequisites: Email address.
- Happy path: Request reset ? neutral acknowledgment ? email callback.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `public`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: Supabase email configuration. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Reset password

- Actor: All. Goal: complete reset password safely. Entry: `/update-password`.
- Prerequisites: Verified recovery code or OTP.
- Happy path: Validate recovery ? enter matching password ? update ? sign-in.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `public`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: Supabase email configuration. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Session expiry

- Actor: All. Goal: complete session expiry safely. Entry: `Protected routes`.
- Prerequisites: Verified refresh token.
- Happy path: Proxy refresh ? continue; failed refresh ? sign-in with safe return path.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `home.view`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-49. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Multi-role switching

- Actor: All. Goal: complete multi-role switching safely. Entry: `Header context switcher`.
- Prerequisites: Multiple trusted membership roles.
- Happy path: POST role ? check membership ? cookie ? full navigation ? clear context data.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `home.view`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-49. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Student dashboard

- Actor: Student. Goal: complete student dashboard safely. Entry: `/student/dashboard`.
- Prerequisites: Active enrollment.
- Happy path: Today ? deadlines ? feedback ? open related work.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `dashboard.student`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-52. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Student classes

- Actor: Student. Goal: complete student classes safely. Entry: `/student/classes`.
- Prerequisites: Active enrollment.
- Happy path: Classes ? class detail ? assignments/materials/people.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `classes.view`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-51,52. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Student assignment submission

- Actor: Student. Goal: complete student assignment submission safely. Entry: `/student/assignments/[assignmentId]`.
- Prerequisites: Published assignment in enrolled class.
- Happy path: Instructions ? choose/drop file ? validate ? upload ? review ? confirm ? server timestamp.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `assignments.submit`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-53,59. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Student grades

- Actor: Student. Goal: complete student grades safely. Entry: `/student/grades`.
- Prerequisites: Published own grades.
- Happy path: View marks ? open feedback ? associated assignment.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `grades.view_own`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-54. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Student notes/resources

- Actor: Student. Goal: complete student notes/resources safely. Entry: `/student/notes`.
- Prerequisites: Published resources in enrolled classes.
- Happy path: Search resources ? short-lived authorized download.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `materials.view`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-55,59. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Student timetable

- Actor: Student. Goal: complete student timetable safely. Entry: `/student/timetable`.
- Prerequisites: Enrolled classes.
- Happy path: Day/time ? class ? details.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `timetable.view`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-52. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Teacher dashboard

- Actor: Teacher. Goal: complete teacher dashboard safely. Entry: `/teacher/dashboard`.
- Prerequisites: Assigned classes.
- Happy path: Review queue ? deadlines/drafts ? grades/AI tasks.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `dashboard.teacher`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-52. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Teacher classes

- Actor: Teacher. Goal: complete teacher classes safely. Entry: `/teacher/classes`.
- Prerequisites: Assigned classes.
- Happy path: Class ? learners ? assignments ? resources.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `classes.view`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-51,52. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Teacher assignment creation

- Actor: Teacher. Goal: complete teacher assignment creation safely. Entry: `/teacher/assignments/new`.
- Prerequisites: Assigned class.
- Happy path: Details ? rules/attachment ? preview ? save draft ? confirm publish.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `assignments.manage`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-53,59. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Teacher material upload

- Actor: Teacher. Goal: complete teacher material upload safely. Entry: `/teacher/materials`.
- Prerequisites: Assigned class.
- Happy path: Class/topic ? file ? metadata ? upload ? preview ? save draft ? confirm publish.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `materials.manage`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-55,59. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Teacher submission review

- Actor: Teacher. Goal: complete teacher submission review safely. Entry: `/teacher/submissions`.
- Prerequisites: Own class submissions.
- Happy path: Open ? download ? mark/feedback ? save draft ? publish ? next/previous learner.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `submissions.review`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-53,54,59. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Teacher gradebook

- Actor: Teacher. Goal: complete teacher gradebook safely. Entry: `/teacher/gradebook`.
- Prerequisites: Own class assessments.
- Happy path: Class/assessment ? cell edit ? validate ? dirty count ? atomic save ? reload.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `grades.manage`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-54. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Teacher AI note compiler

- Actor: Teacher. Goal: complete teacher ai note compiler safely. Entry: `/teacher/ai?tool=compile-notes`.
- Prerequisites: Assigned class and authorized sources.
- Happy path: Configure ? queued ? processing ? completed ? edit draft ? review ? publish.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `ai.use`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-55,59,60. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Teacher AI test generator

- Actor: Teacher. Goal: complete teacher ai test generator safely. Entry: `/teacher/ai?tool=create-test`.
- Prerequisites: Assigned class and authorized sources.
- Happy path: Topics/types/difficulty/marks ? job ? edit/reorder/delete questions ? review ? publish.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `ai.use`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-55,59,60. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Teacher AI assignment generator

- Actor: Teacher. Goal: complete teacher ai assignment generator safely. Entry: `/teacher/ai?tool=create-assignment`.
- Prerequisites: Assigned class and authorized sources.
- Happy path: Objective/tasks ? job ? review ? convert to ordinary assignment draft.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `ai.use`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-53,55,59,60. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Admin dashboard

- Actor: Admin. Goal: complete admin dashboard safely. Entry: `/admin/dashboard`.
- Prerequisites: Trusted admin membership.
- Happy path: Invitations/access/enrollment/class exceptions ? operational action.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `dashboard.admin`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-49,51,52. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Admin users

- Actor: Admin. Goal: complete admin users safely. Entry: `/admin/users`.
- Prerequisites: Trusted admin membership.
- Happy path: Search ? user detail ? invite/status ? confirmation ? audited server commit.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `users.manage`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-49,51. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Admin students

- Actor: Admin. Goal: complete admin students safely. Entry: `/admin/students`.
- Prerequisites: School-scoped student records.
- Happy path: Search/filter ? profile ? guardians/enrollment/attendance/history.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `students.manage`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-51. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Admin teachers

- Actor: Admin. Goal: complete admin teachers safely. Entry: `/admin/teachers`.
- Prerequisites: School-scoped teacher records.
- Happy path: Search ? profile ? classes/timetable/access/history.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `users.manage`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-49,51. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Admin classes

- Actor: Admin. Goal: complete admin classes safely. Entry: `/admin/classes`.
- Prerequisites: School-scoped classes.
- Happy path: List ? class ? teacher assignment ? enrollment.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `classes.manage`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-51. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Admin enrollment

- Actor: Admin. Goal: complete admin enrollment safely. Entry: `/admin/enrollments`.
- Prerequisites: Active student and school class.
- Happy path: Student ? class ? review ? confirm ? server commit.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `enrollments.manage`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-51. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Admin roles/access

- Actor: Admin. Goal: complete admin roles/access safely. Entry: `/admin/roles`.
- Prerequisites: Trusted admin, not last-admin removal.
- Happy path: User ? allowlisted role ? impact ? confirmation ? audited transaction.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `roles.manage`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-49. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Admin audit

- Actor: Admin. Goal: complete admin audit safely. Entry: `/admin/audit`.
- Prerequisites: Trusted admin membership.
- Happy path: Filter action/actor/date ? authorized event detail.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `audit.view`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-49,52. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Notifications

- Actor: All. Goal: complete notifications safely. Entry: `/notifications`.
- Prerequisites: Recipient/class audience.
- Happy path: List ? authorized deep link; lost access ? generic denial.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `notifications.view`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-52. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Search

- Actor: All. Goal: complete search safely. Entry: `/search and Ctrl/Cmd+K`.
- Prerequisites: Active context.
- Happy path: Query ? server-authorized bounded results ? arrows/Enter ? resource.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `search.use`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-52. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Global errors

- Actor: All. Goal: complete global errors safely. Entry: `error.tsx`.
- Prerequisites: Request failure.
- Happy path: Local progress ? sanitized error ? retry preserving unsaved work.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `home.view`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-52. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.

## Permission denied

- Actor: All. Goal: complete permission denied safely. Entry: `Protected role and resource routes`.
- Prerequisites: Missing role/ownership.
- Happy path: Deny generically without leaking record existence ? valid dashboard.
- Alternatives: cancel before confirmation; keep a draft; retry failed requests; return to a permitted dashboard when context changes.
- Capability: `server capability`. RLS/data scope: active school AND owned/enrolled/assigned resource; students only own published academic results; admin only current school; AI drafts only requesting teacher.
- Loading: page skeleton and local pending action; disable duplicate commits. Empty: explain no matching work and suggest clear filters or return to dashboard.
- Validation: field-linked errors; retain inputs; focus first invalid field. Permission: generic access denial with no restricted details. Error: product-language retry, retain draft, never claim success before server acknowledgment.
- Mobile: stacked fields/cards at 360/390px, drawer navigation, ?44px actions; gradebook one assessment at a time.
- Accessibility: semantic headings/labels, visible focus, keyboard-only operation, trapped/restored dialog focus, polite status announcements; statuses include text.
- Backend dependency: VIM-49. Audit: server-owned event for mutations/privileged access; no frontend-authored audit accepted as authoritative.
- Acceptance: entry and deep links resolve; guard denies unauthorized role/tenant/resource; all states above work; confirmed writes persist after reload; test adapter is explicitly identified; production dependency remains blocked until verified.
