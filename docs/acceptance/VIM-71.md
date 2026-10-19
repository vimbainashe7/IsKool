# VIM-71 owner acceptance

```powershell
cd C:\Users\User\Documents\aiDo\IsKool_unified
npm run dev:check
npm run dev:iskool
```

Wait for `PASS LIVE IsKool ready`, then open `http://127.0.0.1:3000/sign-in` with the existing Admin development account/password. Startup never migrates, seeds or resets records.

1. Settings → Account: edit **Your display name**, **Save my name**. Confirm sidebar/profile menu and dashboard welcome after navigation/reload.
2. Edit **School name**, **Save school name**. Confirm header, sidebar, footer and browser title update.
3. Upload PNG/JPEG/WebP up to 2 MB and 4096×4096 pixels, **Save school logo**. Confirm header/sidebar and reload persistence.
4. Upload a different image, **Replace school logo**, then **Remove school logo** and confirm. Reload: school name/records remain with the initials fallback.
5. Teacher and Student in that school see its saved identity without branding edit controls. Their own names must not change when the Admin edits their own profile.
6. Invalid images, stale edits and unauthorized writes show useful errors. Another school's identity remains isolated.

```powershell
npm run smoke:vim-71
```

The smoke requires separately provisioned, approved development `branding.admin/teacher/student/other@example.test` fixtures in dedicated acceptance schools; it does not rename the owner's School Alpha. Private fixture credentials come from ignored local configuration. It uses one real browser worker and verifies edits, invalid/stale rejection, different-image replacement, cross-role branding, cross-school asset denial, removal, reload and mobile layout. It never provisions users, rotates credentials, migrates, deletes schools or resets student data. Traces are disabled and credential artifacts are redacted.

Database replay/security tests run only on fresh disposable PostgreSQL: all canonical migrations, `npm run db:master-data:test`, and `node scripts/check-prisma-drift.mjs` with the explicitly guarded loopback test URL. Tests use non-superuser, non-bypass runtime logins: own/foreign school/user, Registrar/Teacher/Student, disabled Admin, column privilege and APS write denials. Never run hosted destructive/replay tests.
