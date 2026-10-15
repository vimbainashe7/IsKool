# ADR-0003: Data Ownership and SAMS Boundary

Status: Accepted

Date: 2026-09-19

## Context

Revision 2.0 includes APS schema material containing `students`, while also stating SAMS owns the student master record exclusively.

## Decision

SAMS is authoritative for student master records, enrollments, guardians, attendance, finance, staff/HR, timetables, and administrative reporting. APS owns academic workflow data and does not maintain a writable duplicate of SAMS student records.

## Alternatives Considered

- Duplicate writable student tables in APS: rejected because it creates conflicting sources of truth.
- Direct APS writes to SAMS schema: rejected by ownership boundary.

## Consequences

APS must call SAMS internal APIs or consume read projections. Any APS student profile data is non-authoritative and read-only unless specifically ratified later.

## Migration / Follow-up

Resolve enrollment semantics before domain migration 001.

## References

- Revision 2.0, APS Section 15
- Revision 2.0, SAMS Section 12
- `docs/schema/ENROLLMENT_PROPOSAL.md`
