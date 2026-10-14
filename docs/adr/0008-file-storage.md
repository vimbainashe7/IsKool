# ADR-0008: File Storage

Status: Accepted

Date: 2026-09-19

## Context

Revision 2.0 requires object storage or local disk outside web root with authenticated access and file validation controls.

## Decision

Use an S3-compatible object storage abstraction. Use MinIO for local development.

## Alternatives Considered

- Local disk as primary storage: rejected for production durability and scaling.
- Direct AWS SDK usage in controllers: rejected by architecture boundary.

## Consequences

Stored object keys are generated server-side and never derived from unsafe user filenames. Download URLs are created only after authorization.

## Migration / Follow-up

Add magic-byte validation, malware scan hooks, size limits, and lifecycle cleanup in upload feature work.

## References

- Revision 2.0, APS Section 10.2
- Revision 2.0, SAMS Section 9.2
