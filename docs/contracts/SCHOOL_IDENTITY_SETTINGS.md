# School identity and own Admin profile — VIM-71

SAMS owns these writes to existing shared identity records. The current user and school come from the validated session. Bodies cannot select another school/user or change roles, email, passwords or school status.

Role-catalogue authorization uses forced RLS on `roles`: SAMS can read only keys assigned to its current active membership. The forward lookup migration makes fresh replay match hosted RLS behavior; school/profile predicates remain security invoker functions.

| Method | SAMS route under `/api/v1` | Input/output |
| --- | --- | --- |
| GET | `/school-settings` | `{school:{id,name,logoPresent,brandingVersion},user:{id,displayName,profileVersion}}` |
| PATCH | `/school-settings` | `{name,version}`; trimmed name 1–200 characters |
| PATCH | `/school-settings/profile` | `{displayName,version}`; own name 1–100 characters |
| POST | `/school-settings/logo` | Multipart `logo` and integer `version` |
| DELETE | `/school-settings/logo` | `{version}`; retains school records |

Settings routes require active SAMS scope and Admin role. Runtime grants cover only relevant columns; UPDATE policies enforce own Admin/current school. Existing FORCE RLS remains enabled. Version checks reject stale writes with 409; triggers enforce increments. Mutations and audit events share a principal-scoped transaction. Audit actions: `profile.display_name_updated`, `school.name_updated`, `school.logo_updated`, `school.logo_removed`. Image bytes are excluded from audit/log payloads.

Uploads accept real decoded PNG/JPEG/WebP signatures: at most 2 MiB, 4096 pixels per dimension, 16M pixels, one non-animated image. The server re-encodes to WebP, at most 256×256 and 48 KiB, stripping metadata/appended content. Original filenames/bytes are discarded. SVG, remote URLs and public object links are not accepted. The bounded canonical asset lives on the existing school identity record; constraints enforce size, envelope and presence consistency. This does not complete general academic-file milestone VIM-59.

Both services' `/auth/context` responses include relative `/api/school-logo?v=VERSION` when present. Shared identity queries select metadata without image bytes. Each service exposes protected `GET /auth/school-logo` through its existing scoped JWT guard and principal school, returning private/no-store WebP. APS receives no new writes or access to SAMS-owned student/enrollment tables. Frontend `/api/school-logo` uses the correct HttpOnly scope cookie; no school identifier is accepted. Asset responses use private/no-store and nosniff headers.

Saved server context feeds the sidebar, header, footer, profile name and authenticated browser title/favicon. Other sessions retrieve current branding on navigation/reload. Public sign-in keeps the platform fallback; tenant-domain routing, school/account creation/deletion and role administration are separate workflows.

Sharp is pinned to patched 0.35.5; the initially considered 0.34.5 had high decoder advisories and was replaced before deployment. SAMS enables CommonJS interoperability for the supported default import; two Supertest imports were adjusted without assertion changes. Existing unrelated dependency advisories remain release work.

Sources: [Sharp input limits](https://sharp.pixelplumbing.com/api-constructor/), [output options](https://sharp.pixelplumbing.com/api-output/), [patched release](https://sharp.pixelplumbing.com/changelog/v0.35.5/), [PostgreSQL RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).
