# Student assignment access and text submissions

VIM-53, increment 2. Based on the human-accepted Teacher publication increment,
merged in PR #11 as `57cd40555b4602bbb89e1b137fc6aacafd1e3936`.

## Business behavior

Only published assignments for the signed-in student's active school, linked
student identity, class and current term are available. SAMS remains the identity
and enrollment authority. APS uses the authenticated SAMS boundary and restricted
database RLS; it has no direct student/enrollment table SELECT grant.

This increment supports text answers only (1–10,000 characters), with up to three
append-only attempts per assignment during active term enrollment. Late answers
are accepted and visibly marked late. Original answers and server timestamps
remain in history. The policy is fixed and shown to Teacher and Student; school
policy configuration, files, grading and release are subsequent capabilities.

Each student has ten submission requests per rolling minute across all assignments.
The database serializes budget consumption, which commits before submission
validation, so duplicates and rejected work also spend the budget. An identical
latest answer within 30 seconds returns the existing submission without creating
another attempt/audit. Different concurrent answers require the expected prior
attempt; stale requests fail with 409. Submission and audit writes are atomic.
Membership disablement, archival and enrollment withdrawal remove access.

## Owner test (Windows)

```powershell
Set-Location C:\Users\User\Documents\aiDo\IsKool_unified
npm run dev:iskool
```

Open `http://127.0.0.1:3000/sign-in`. The stable local password is in ignored
`Passwords.txt` at the repository root. Do not publish that file.

1. Ensure Admin has linked Student Alpha's account to an active student and
   enrolled that student in a current class/term assigned to Teacher Alpha.
2. Teacher → Assignments → create a draft in that class/term, save and publish.
3. Student → Dashboard: open the published assignment, enter an answer and submit.
4. Reload: the answer, attempt number, server time and status must persist.
5. Edit and resubmit: both attempts must remain after reload. Three attempts is
   the maximum. Repeating the same answer within 30 seconds adds no attempt.
6. Admin → withdraw the enrollment. Student reload/access/submission must fail
   for that assignment. Restore access through an approved new enrollment.

Automated live test: `npm run smoke:submissions` (one worker, private credential
loading, redacted reports). It creates real retained development records.

## Verification record

Restricted LOGIN SQL covers published/draft visibility, other students and
schools, author/co-teacher scope, server time/status, immutable attempts, dedup,
budgets, audit rollback and immediate enrollment/membership revocation.
Fresh migration replay, Prisma drift, local browser persistence, exact-head CI,
owner acceptance and merge are tracked separately in PRODUCT_DELIVERY.md/PR.
