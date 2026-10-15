# ADR-0009: Testing Strategy

Status: Accepted

Date: 2026-09-19

## Context

Revision 2.0 prioritizes meaningful integration tests over isolated unit-only coverage.

## Decision

Use Jest for unit and integration tests, Supertest for HTTP app tests, disposable PostgreSQL/Redis strategies for dependency-backed tests, and Playwright later for cross-application E2E.

## Alternatives Considered

- Unit-only foundation: rejected because it gives weak confidence on API behavior.
- Browser E2E during backend foundation: deferred until web apps exist.

## Consequences

Every API repo should test boot, invalid env, validation, error envelope, health, readiness, and request ID propagation before domain features.

## Migration / Follow-up

Financial, ownership, and AI job lifecycle paths require integration tests before production data.

## References

- Revision 2.0, APS Section 13
- Revision 2.0, SAMS Section 15
