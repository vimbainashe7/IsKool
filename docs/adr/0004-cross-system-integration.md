# ADR-0004: Cross-System Integration

Status: Accepted

Date: 2026-09-19

## Context

Revision 2.0 permits read-only DB access or a SAMS internal API for APS-to-SAMS reads.

## Decision

Prefer SAMS internal API as the normal integration architecture. APS must not depend on direct cross-schema joins for application behavior.

## Alternatives Considered

- Shared DB read-only user: acceptable for constrained deployments but not the default architecture.
- Database links/cross-schema joins: rejected as normal architecture because it couples APS to SAMS persistence.

## Consequences

Contracts, timeouts, retries, failure mapping, and correlation propagation are explicit integration concerns.

## Migration / Follow-up

Implement `SamsClient` in `aps-api` when integration work begins.

## References

- `docs/contracts/INTERNAL_SAMS_API.md`
