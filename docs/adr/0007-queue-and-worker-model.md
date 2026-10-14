# ADR-0007: Queue and Worker Model

Status: Accepted

Date: 2026-09-19

## Context

Revision 2.0 requires Redis + BullMQ for AI compilation and queued reporting.

## Decision

Use BullMQ with Redis. API processes enqueue jobs through infrastructure abstractions; worker processes run separately.

## Alternatives Considered

- In-process background jobs: rejected because they do not survive deploy/restart reliably.
- Kafka/RabbitMQ: not needed for foundation scope.

## Consequences

Jobs include version, correlation ID, actor ID, created timestamp, optional idempotency key, and domain payload. Queues define attempts, exponential backoff, timeouts, concurrency caps, and failure visibility.

## Migration / Follow-up

No real AI jobs are implemented in foundation work.

## References

- Revision 2.0, APS Section 6
- Revision 2.0, SAMS Section 7
