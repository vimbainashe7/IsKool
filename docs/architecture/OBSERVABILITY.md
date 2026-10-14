# Observability

Foundation baseline:

- structured logs
- request/correlation IDs
- health and readiness endpoints
- dependency readiness checks
- queue instrumentation hook
- metrics hook
- slow-request warnings
- safe exception logging

Never log passwords, JWTs, refresh tokens, payment secrets, provider secrets, database URLs, Redis URLs, or storage credentials.

Future metrics:

- authentication failures
- authorization denials
- database latency
- queue depth and failures
- AI provider latency and cost
- report generation duration
- submission rate limiting
- financial transaction failures
