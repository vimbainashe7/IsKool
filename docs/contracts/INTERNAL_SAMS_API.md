# Internal SAMS API

These are proposed internal read endpoints for APS integration, not verbatim Revision 2.0 requirements.

Endpoints:

- `GET /internal/v1/students/:studentId/profile`
- `GET /internal/v1/students/:studentId/enrollments/current`
- `GET /internal/v1/classes/:classId/members/:studentId`
- `GET /internal/v1/timetables/students/:studentId?...`

Requirements:

- Service-to-service authentication.
- Not publicly exposed by default.
- Typed request and response contracts.
- Timeout on every call.
- Safe retry strategy for idempotent reads only.
- Failure mapping to APS-safe errors.
- Correlation ID propagation.
- No APS writes.

Future APS adapter:

- `SamsClient.getStudentProfile(studentId)`
- `SamsClient.getCurrentEnrollment(studentId)`
- `SamsClient.assertClassMembership(classId, studentId)`
- `SamsClient.getStudentTimetable(studentId, filters)`

APS business modules depend on this abstraction rather than raw HTTP clients.

Timeout policy:

- Default timeout: 2 seconds.
- Authorization membership checks fail closed when SAMS is unavailable.
- Non-critical display reads may return a mapped dependency-unavailable response.

Retry policy:

- Retry only idempotent reads.
- Use bounded retries with jitter.
- Do not retry 401, 403, 404, or validation failures.

Error mapping:

- SAMS `401/403` maps to APS dependency authorization failure.
- SAMS `404` maps to missing/inaccessible resource as appropriate.
- SAMS `409/422` should not normally appear for read contracts and must be logged.
- SAMS `5xx` or timeout maps to `SAMS_UNAVAILABLE` without leaking internals.

Logging:

- Propagate `x-request-id`.
- Log route template, status, latency, and dependency name.
- Do not log tokens, student record payloads, secrets, or raw provider errors.
