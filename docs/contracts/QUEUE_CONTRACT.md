# Queue Contract

Queues:

- `aps-ai-notes`
- `aps-ai-exams`
- `sams-pdf-reports`
- `notifications`

Every job includes:

- job version
- correlation ID
- actor ID when available
- idempotency key where appropriate
- created timestamp
- domain payload

Defaults:

- Attempts: 3
- Backoff: exponential
- Timeout: set per processor based on dependency risk
- Concurrency: capped per queue
- Failed jobs remain visible long enough for operational review
- Completed jobs are retained briefly, then cleaned up

Foundation work does not implement real LLM calls.
