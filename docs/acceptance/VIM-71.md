# VIM-71 owner acceptance

```powershell
cd C:\Users\User\Documents\aiDo\IsKool_unified
npm run dev:check
npm run dev:iskool
```

Wait for `PASS LIVE IsKool ready`, then open `http://127.0.0.1:3000/sign-in` with the existing Admin development account/password. Startup never migrates, seeds or resets records.

1. Settings / Account: edit **Your display name**, **School name** and select a PNG/JPEG/WebP logo up to 2 MB and 4096 pixels per dimension. These remain drafts until saved.
2. Click the single **Save changes** button. Confirm one green **Settings saved** toast, then navigate/reload. Check your name in the sidebar/profile menu and school identity in the header/sidebar/footer/browser title.
3. Select a different image and **Save changes** once. Confirm replacement after reload.
4. Click **Remove school logo** (preview only; **Undo logo removal** cancels), then **Save changes**. Reload: school name/records remain with the initials fallback.
5. Teacher and Student in that school see its saved identity without branding edit controls. Their own names must not change when the Admin edits their own profile.
6. Invalid images, stale edits and unauthorized writes show useful errors. Another school's identity remains isolated.

```powershell
npm run smoke:vim-71
```

The smoke requires separately provisioned, approved development `branding.admin/teacher/student/other@example.test` fixtures in dedicated acceptance schools; it does not rename the owner's School Alpha. Private fixture credentials come from ignored local configuration. It uses one real browser worker and verifies edits, invalid/stale rejection, different-image replacement, cross-role branding, cross-school asset denial, removal, reload and mobile layout. It never provisions users, rotates credentials, migrates, deletes schools or resets student data. Traces are disabled and credential artifacts are redacted.

Database replay/security tests run only on fresh disposable PostgreSQL: all canonical migrations, `npm run db:master-data:test`, and `node scripts/check-prisma-drift.mjs` with the explicitly guarded loopback test URL. Tests use non-superuser, non-bypass runtime logins: own/foreign school/user, Registrar/Teacher/Student, disabled Admin, column privilege and APS write denials. Never run hosted destructive/replay tests.

Owner accepted the revised single-save workflow and explicitly approved PR #6 then PR #7 on 2026-10-20. PR #6 merged as `81c7c15`; PR #7 requires passing integrated-head CI before its authorized merge. Acceptance and release are tracked separately.
