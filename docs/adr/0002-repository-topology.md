# ADR-0002: Repository Topology

Status: Superseded by [ADR-0010](0010-single-repository-monorepo.md)

Date: 2026-09-19

## Context

Revision 2.0 leans toward separate repositories rather than a frontend monorepo. This current repository contains product documentation only and behaves as an umbrella/control repository.

## Decision

Use separate repositories: `APS-SAMS`, `aps-api`, `sams-api`, `aps-web`, and `sams-web`. This repository remains the architecture/control repository with reusable bootstrap templates.

Repository responsibilities:

- `APS-SAMS`: architecture decisions, cross-system contracts, ADRs, operational standards, migration policy, security policy, diagrams, and reusable bootstrap templates.
- `aps-api`: APS backend runtime, APS persistence, APS OpenAPI, APS workers, APS migrations.
- `sams-api`: SAMS backend runtime, SAMS persistence, SAMS OpenAPI, SAMS workers, SAMS migrations.
- `aps-web`: APS frontend.
- `sams-web`: SAMS frontend.

Deployment boundaries:

- APS API and SAMS API are independently deployable.
- APS web and SAMS web are independently deployable.
- Cross-system behavior uses versioned API contracts, not shared private persistence.

The `bootstrap/nest-service-template` directory is a template. It must be copied or generated into service repositories and then owned by those repositories. It must not become a hidden runtime package dependency shared by both APIs.

Shared design-token strategy:

- Frontend repositories may share a versioned design-token artifact after a real duplication cost appears.
- Until then, duplicate small configuration deliberately to avoid coupling release trains.

Shared package threshold:

- Create a shared package only for stable, low-churn contracts or generated clients.
- Prefer duplication when code is small, domain-specific, or likely to change independently.

## Alternatives Considered

- Permanent monorepo: simplifies shared tooling but increases accidental coupling between APS and SAMS.
- One backend repo with modules: risks direct persistence coupling.

## Consequences

Shared conventions live here as docs/templates. Production code belongs in service-specific repositories unless a newer ADR changes this.

This decision is preserved as architectural history. It was appropriate for the earlier Revision 2.0 interpretation, but it introduced avoidable source-control, CI, Docker/XAMPP, and frontend/backend integration friction once APS and SAMS started moving as one coordinated platform.

## Migration / Follow-up

Create API repositories from the template after M0 decisions are ratified in Linear.

## References

- Revision 2.0, frontend/tooling notes
