# Internal SAMS API

VIM-52 implements the approved VIM-38/ADR 0004 boundary. SAMS owns student master records, school calendars, administrative classes, enrollments and teaching assignments. APS consumes the typed `SamsClient` and receives no direct SAMS domain table privileges or mutation routes. Timetable remains a separate milestone.

Endpoints:

- `GET /internal/v1/students/:studentId/profile`
- `GET /internal/v1/students/:studentId/enrollments/current`
- `GET /internal/v1/classes/:classId/members/:studentId`
- `GET /internal/v1/classes/:classId/teaching-authority`
- `GET /internal/v1/memberships/current`
- `GET /internal/v1/context?role=student|teacher&limit=25&cursor=<uuid>` (optional `classId`)

The optional private Nest listener defaults to `127.0.0.1:3003`, separate from public SAMS and Swagger. Enable `SAMS_INTERNAL_ENABLED` and a matching private `SAMS_INTERNAL_SERVICE_KEY` in both APIs. Non-loopback listening also requires explicit `SAMS_INTERNAL_ALLOW_NETWORK=true` and deployment-owned private network/TLS controls. APS requires HTTPS except for non-production loopback. No service credentials enter frontend code.

Each request requires a separate HS256 service JWT (`Authorization`) and the original APS access JWT (`x-iskool-actor-token`). Service tokens expire in 45s and bind issuer `iskool:aps:internal`, audience `iskool:sams:internal`, subject `aps-api`, and scope `sams:context:read`. They cannot select an actor. SAMS independently verifies the actor signature/scope and live session/membership, derives current roles and school, and then queries with restricted-runtime RLS. Requests cannot choose a school, user or membership. Unknown and inaccessible resources share a 404.

Runtime DTOs live in `@aps-sams/sams-contracts`. Pagination defaults to 25, maximum 50, with one extra row for cursor detection. Context version 1 binds school, membership, role and snapshot timestamp. Classes include the academic year, current terms and, for Teacher only, distinct active student counts. Student context requires an active master record linked to that Student membership and an active enrollment in a current term. Teacher context requires an active assignment in the current academic year. Calendar dates use the existing Africa/Harare convention with inclusive boundaries. Administrative students without a sign-in account remain legitimate registry records but grant no Student academic access.

One grouped SQL snapshot loads the bounded class page, total, terms and counts without per-class network calls. More than 100 overlapping current terms is an explicit configuration error. A membership disabled between guard verification and that snapshot fails with 401 rather than returning a false zero. Tenant/cursor and assignment lookup indexes are mapped in Prisma.

APS exposes authenticated GET `/api/v1/academic-context` and `/api/v1/academic-context/classes/:id`, with required `role`. The Next.js `/api/academic-context` boundary forwards only the HttpOnly APS cookie to APS. Live Student/Teacher Classes screens validate returned school/membership, distinguish loading/empty/failure, and use no fixture fallback. Assignment, grade and timetable screens remain separate milestones.

Admin/Registrar account-link and teaching-assignment changes use the existing authenticated SAMS mutation boundary, optimistic versions and an audit record in the same database transaction. Teacher revoke/restore retains history. No destructive delete or role elevation is exposed.

Requirements:

- Service-to-service authentication.
- Not publicly exposed by default.
- Typed request and response contracts.
- Timeout on every call.
- Safe retry strategy for idempotent reads only.
- Failure mapping to APS-safe errors.
- Correlation ID propagation.
- No APS writes.

APS adapter:

- `SamsClient.getStudentProfile(studentId)`
- `SamsClient.getCurrentEnrollments(studentId)`
- `SamsClient.assertClassMembership(classId, studentId)`
- `SamsClient.assertTeachingAuthority(classId)`
- `SamsClient.getCurrentMembership()`
- `SamsClient.getAuthorizedContext(query)`

APS business modules depend on this abstraction rather than raw HTTP clients.

Timeout policy:

- Default timeout: 2 seconds.
- Configurable 100–10,000ms; local setup explicitly uses 8,000ms for hosted development latency. Database transaction limits remain unchanged.
- Authorization membership checks fail closed when SAMS is unavailable.
- Non-critical display reads may return a mapped dependency-unavailable response.

Retry policy:

- Retry only idempotent reads.
- Use bounded retries with jitter.
- At most one retry, with 25–75ms jitter, for network/5xx GET failures. Redirects are refused and response bodies are bounded to 256KiB.
- Do not retry 401, 403, 404, or validation failures.

Error mapping:

- SAMS `401/403` maps to APS dependency authorization failure.
- SAMS `404` maps to missing/inaccessible resource as appropriate.
- SAMS `409/422` should not normally appear for read contracts and must be logged.
- SAMS `5xx` or timeout maps to `SAMS_UNAVAILABLE` without leaking internals.
- Malformed, wrong-school, wrong-membership or unauthorized upstream contracts fail with safe 502; they are never retried or converted into empty results.

Logging:

- Propagate `x-request-id`.
- Log route template, status, latency, and dependency name.
- Do not log tokens, student record payloads, secrets, or raw provider errors.
- Responses use `private, no-store`, including private authentication errors.

Verification: replay all canonical migrations through `20261020090000_authorized_class_context.sql` in a disposable database, then run `npm run db:master-data:test` with restricted LOGIN roles and `npm run db:drift:check`. Normal package/API suites include contracts, service/client, guard and actual private-listener HTTP tests. `npm run smoke:vim-52` exercises the real browser/API/development database. Neither launcher nor smoke applies migrations or seeds at startup. Loopback development does not establish deployed network security or production release readiness.
