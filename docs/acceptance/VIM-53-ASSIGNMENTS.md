# Teacher assignment publication

First VIM-53 increment; the complete Student submission/review journey remains unfinished.

## Acceptance

An assigned Teacher can create a text assignment for their own class and one of its terms, save/edit a draft, reload it, publish it, observe the published total on the Teacher dashboard, then archive it without deletion. Publication fixes content and records its timestamp on the server. Draft and publication writes record an audit in the same database transaction. A stale version returns a conflict; the form retains unsaved edits on errors. No attachments are enabled.

APS owns `assignments`. SAMS supplies class/year/term eligibility through its authenticated internal read boundary. A private principal-bound PostgreSQL boolean enforces the same teaching context for RLS; APS receives no direct SELECT privilege on SAMS student, teaching or enrollment tables. Assignment reads are author-specific, including co-teachers. Admin and Student roles cannot assume Teacher ownership. Revoked teaching authority or disabled membership immediately removes database access.

## Local human test

```powershell
Set-Location C:\Users\User\Documents\aiDo\IsKool_unified
npm run dev:iskool
```

Use `http://127.0.0.1:3000/sign-in`, choose Teacher and enter the password from ignored local `Passwords.txt`. Open Assignments > Create assignment. Choose an assigned class and term containing a future deadline; enter title, instructions, marks and that deadline (Africa/Harare). Save draft, edit instructions, save and reload. Publish the saved draft, reload and check its status. Open Dashboard and check the published count. Reopen the assignment and archive it; reload to verify retained history. A class/term must first exist and be assigned through the Admin interface.

Automated live acceptance:

```powershell
npm run smoke:assignments
```

This creates one clearly named Pilot Assignment in the approved development database and archives it after testing. It preserves credentials, owner branding and existing records. The browser run uses one worker, disables traces and redacts the private credential from failure reports.

## Verification scope

`npm run db:master-data:test` uses disposable local PostgreSQL only, including restricted LOGIN identities for author/class/tenant denials, co-teacher privacy, deadline/content/version constraints, immutable published content, archival, server publication time, audit rollback and immediate teaching/membership revocation. `npm run db:drift:check` compares Prisma to the replayed database. Never point destructive integration fixtures at hosted data.

Student assignment feeds, submissions, resubmission/late policies, grading, file ingestion and abuse controls are subsequent VIM-53 increments. Publishing in this increment does not claim students can submit work yet. Human acceptance, merge and production release remain distinct gates.
