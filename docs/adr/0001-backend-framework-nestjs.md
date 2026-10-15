# ADR-0001: Backend Framework NestJS

Status: Accepted

Date: 2026-09-19

## Context

Revision 2.0 permits Express with guardrails or NestJS. The system will be maintained by multiple contributors and must keep controllers, services, repositories, guards, filters, and infrastructure boundaries clear.

## Problem

APS and SAMS will eventually contain academic records, student records, staff data, and financial transactions. A loosely structured backend would make it too easy for later contributors to place business logic in route handlers, bypass authorization policy, or couple APS directly to SAMS persistence.

## Decision

Use Node.js LTS, strict TypeScript, and NestJS for independently deployable APS API and SAMS API services.

Each service is a modular monolith: modules are organized by domain capability inside a single deployable backend, with explicit internal boundaries and no premature microservice split.

Required dependency direction:

```text
controller
  -> application/domain service
  -> repository or infrastructure adapter
  -> Prisma/infrastructure client
```

Forbidden dependencies:

- controller -> Prisma
- controller -> raw database access
- controller -> embedded business workflow logic
- controller -> LLM provider SDK
- controller -> S3 SDK
- domain/application service -> Nest HTTP request/response objects
- APS domain -> direct SAMS persistence writes
- SAMS domain -> APS persistence

Repository and adapter code may depend on Prisma or infrastructure SDKs. Controllers depend on services. Services coordinate business rules, authorization policy, transactions, repositories, infrastructure abstractions, and audit calls.

## Alternatives Considered

- Express with custom guardrails: lower framework weight, but weaker structural enforcement.
- Fastify directly: performant, but more custom architecture work.
- Early microservices: rejected because the current domain does not justify operational complexity.
- One large unstructured backend: rejected because it weakens APS/SAMS ownership boundaries.

## Consequences

NestJS modules, dependency injection, filters, pipes, and testing utilities become the standard. Controllers remain thin and do not access persistence or external providers directly.

APS and SAMS are independently deployable services with separate configuration, authentication scope, observability identity, and persistence ownership.

## Enforcement Strategy

- Standard service template uses `src/modules/<domain>` with controller/service/repository conventions.
- ESLint blocks Prisma, BullMQ, and S3 SDK imports in controllers.
- Code review checklist requires controller/service/repository direction checks.
- CI runs lint, typecheck, tests, build, and Prisma validation.
- ADR-0003 and ADR-0004 enforce the SAMS data boundary.

## Testing Implications

- Unit tests cover isolated policies, validators, and deterministic domain helpers.
- Supertest integration tests cover validation, error envelopes, request IDs, health, and controller/service wiring.
- Persistence behavior that depends on constraints, transactions, or indexes must use a real database in integration tests.
- Tests must prove controllers can satisfy HTTP behavior without direct persistence access.

## Revisit Conditions

Revisit this decision only if:

- NestJS materially blocks a required production capability.
- The team grows enough that one modular monolith per service becomes an operational bottleneck.
- Domain boundaries become independently scalable with clear ownership and observability needs.
- A future ADR proves the migration cost is lower than continuing with NestJS modular monoliths.

## Migration / Follow-up

Use the `bootstrap/nest-service-template` as the starting point for `aps-api` and `sams-api`.

## References

- Revision 2.0, APS Section 8.1
- Revision 2.0, SAMS Section 2
