# Production integration blockers

The existing Supabase SQL is a blueprint, not evidence of deployed policies. No production environment credentials or authenticated domain APIs are available in this session.

| Ticket | Required authoritative contract | Frontend behavior until available |
| --- | --- | --- |
| VIM-49 | Active tenant/ownership authorization, composite tenant FKs; owner-only AI jobs/drafts; own/assigned-class SELECT; atomic last-admin-safe role/status mutation + server audit | Verified SSR identity, server capabilities and scoped reads; sensitive mutations disabled |
| VIM-59 | File reservation returning scoped private key/token; size/type/signature checks, scan/quarantine state, finalize and cleanup; signed read URL with resource ownership | File selection/drop/validation/progress/review/retry/cancel in explicit demo; production uploads disabled |
| VIM-53 | Versioned assignments (marks, due time, late/resubmission rules, attachments); draft/publish; atomic submission finalization with server timestamp | Typed assignment/submission workflow; production mutations disabled |
| VIM-54 | Class assessment roster; versioned atomic bulk grade save; score limits; feedback/draft/published state; conflict response with no partial writes | Controlled keyboard grid, draft tracking and test-adapter save/reload; production save disabled |
| VIM-55 | Materials status/topic/metadata; question bank; reviewed generated content converted into ordinary assignment; audited publish | Published RLS reads; test-adapter draft/review/publish |
| VIM-60 | Durable authenticated job enqueue/read/cancel/retry; worker state queued/processing/completed/failed/canceled; output/source references; provider only on worker/server | Clearly identified persisted development jobs; production generation disabled |
| VIM-51 | Student/guardian identity, term/year enrollment transfers, teacher provisioning, transactional validation | School memberships/enrollment reads; dev-confirmed changes; production privileged writes disabled |
| VIM-52 | Authorized paginated dashboard/search/notification/report projections and tenant-safe deep links | Bounded server scoped reads, useful failure states; no sample fallback |

HTTP boundary: `/api/workspace` reads the current context and never accepts school/actor IDs from the browser. Every request revalidates the session. Mutations are Zod-validated and same-origin checked. Unsupported live mutations return 503 with a product-language message. The development adapter requires `ISKOOl_ENABLE_DEMO=true` (actual environment key: `ISKOOL_ENABLE_DEMO`) AND non-production AND no Supabase configuration. It is not a security or backend substitute.

RLS acceptance: Student A cannot read Student B submission/grade; student cannot read AI draft or write teacher material; teacher cannot read/write unrelated class/grade; School A admin cannot read/write School B. Existing broad Storage policies fail these requirements by inspection. Deployment must not use them for ingestion. Database owners must add and run transactional SQL tests against a real PostgreSQL/Supabase instance; source scans do not prove RLS.
