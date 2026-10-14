# System Context

APS is the academic workspace for teachers and students. SAMS is the administrative, financial, and compliance backbone.

The ecosystem is intentionally split into separate deployable applications:

- `aps-api`
- `sams-api`
- `aps-web`
- `sams-web`
- `APS-SAMS` as the single source repository containing those applications, shared contracts/configuration, database policy, infrastructure, ADRs, and runbooks

The API services share engineering conventions but do not share private persistence. APS must consume SAMS-owned master data through a controlled SAMS internal API/read projection.

All public REST APIs use `/api/v1`.

Source consolidation does not collapse runtime boundaries. APS and SAMS remain independently runnable and independently deployable NestJS services under `apps/`.
