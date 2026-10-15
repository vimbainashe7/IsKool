# Authorization Model

Authorization is layered:

1. Authentication
2. System scope
3. Role
4. Resource ownership or membership
5. Business rule

Examples:

- A teacher role does not grant access to all classes.
- A teacher must own or teach the target class.
- A student cannot read another student's grades.
- Student identity must match the authenticated identity and active enrollment.
- Financial writes are restricted by SAMS role.
- Privileged SAMS waivers/payments may require re-authentication or second approval.

Backend services should implement small guards and policy classes per resource rather than a single global permission switch.

## VIM-49 Policy Kernel

The shared `@aps-sams/auth` package owns the reusable authorization kernel:

- `AuthorizationKernel` returns typed allow/deny decisions.
- `AuthorizationAction` centralizes policy action names instead of scattering role string checks.
- `AuthorizationSubject` starts from the server-validated `AuthPrincipal` and an active membership status.
- `AuthorizationResourceMetadata` carries the target resource school and opaque resource ID.
- resolver interfaces define future adapters for resource school ownership, class access, and enrollment access.

Controllers and application services should pass server-resolved resource metadata into the kernel. Client-provided `userId`, `schoolId`, or role claims must not become actor identity or PostgreSQL RLS context.

Concrete production adapters are intentionally deferred:

- VIM-51 wires student master resources to the kernel.
- VIM-53 wires teacher-class, enrollment, assignment, and submission resources to the kernel.

## VIM-50 Privileged Actions

Privileged SAMS actions, such as future payment recording or fee waivers, opt into an additional policy layer before mutating business state:

- recent authentication is checked by `PrivilegedActionPolicy`;
- second approval is represented as an explicit extension point;
- the actor user, actor membership, school, request ID, action, entity, before value, after value, and reason are written to `audit_events`;
- audit writes must use the same Prisma transaction as the business mutation;
- payment and fee modules are still deferred to their owning issues.
