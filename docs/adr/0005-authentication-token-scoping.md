# ADR-0005: Authentication Token Scoping

Status: Accepted

Date: 2026-09-19

## Context

Revision 2.0 rejects a single JWT accepted by both APS and SAMS.

## Decision

APS and SAMS issue and accept separately scoped JWTs with distinct issuer, audience, scope, and signing secrets.

## Alternatives Considered

- Shared token accepted by both systems: rejected due to blast radius.
- Shared signing key with different claims: rejected because key compromise should not cross systems.

## Consequences

Wrong scope, issuer, or audience is rejected. Roles are resolved server-side and embedded only for the issuing system.

## Migration / Follow-up

Implement refresh rotation and Argon2id password hashing in identity work.

## References

- `docs/contracts/AUTH_CLAIMS.md`
