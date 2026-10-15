# ADR-0012: System-Scoped Authentication Foundation

Status: Accepted

Date: 2026-10-06

Supersedes: none

Extends:

- ADR-0005: Authentication Token Scoping
- ADR-0011: Supabase PostgreSQL RLS Foundation

## Context

VIM-48 implements the first IsKool authentication capability after the Supabase PostgreSQL/RLS foundation. The user experience must remain one IsKool sign-in, but APS and SAMS must not accept the same bearer credential. A token issued for one service must be structurally invalid for the other service.

IsKool owns identity for this phase. Supabase Auth remains out of scope: no `auth.uid()`, Supabase browser session, Supabase magic link, or direct browser access to domain tables is part of this decision.

The current security model is:

1. Global user identity.
2. Active school membership.
3. Membership-scoped roles from `membership_roles`.
4. Server-validated principal propagation into PostgreSQL RLS through `TransactionService.runWithPrincipal()`.

## Decision

Implement an IsKool-owned authentication module that verifies one user-facing sign-in and issues service-scoped credentials internally.

APS access tokens:

- `iss = aps-api`
- `aud = aps`
- `scope = aps`
- signed by the APS signing key

SAMS access tokens:

- `iss = sams-api`
- `aud = sams`
- `scope = sams`
- signed by the SAMS signing key

The authentication service resolves the active school membership before issuing any access token. Roles are resolved server-side from `membership_roles` for that membership. Client-supplied roles are ignored.

Access tokens are short-lived. Refresh credentials are opaque, rotated, hashed before storage, and bound to a revocable session family. Raw refresh tokens are never persisted.

## Required Flow Answers

### 1. Which component verifies username/password?

SAMS owns the identity verification capability because SAMS is the system of record for shared identity and administrative master data. APS does not verify passwords directly. APS receives APS-scoped credentials from the shared IsKool sign-in flow or through a service-to-service credential exchange that SAMS validates.

This does not create two login experiences. The frontend presents one IsKool sign-in and receives the service-scoped access needed for the products the user is allowed to enter.

### 2. Where are password credentials stored?

Password credentials are stored in a global identity credential table owned by IsKool/SAMS identity, separate from tenant membership rows. Membership records never store passwords.

Passwords are hashed with Argon2id. The stored record contains only the Argon2id hash and credential metadata needed for lifecycle controls, such as creation time, update time, and disabled/revoked state. Plaintext, reversible encryption, SHA hashes, and bcrypt are rejected for VIM-48.

### 3. Where are refresh sessions stored?

Refresh sessions are stored in IsKool-owned database tables, not in Supabase Auth. A session belongs to a user and active membership context and records:

- session id
- token family id
- current refresh verifier hash
- user id
- school id
- membership id
- allowed service scopes
- issued time
- expiry time
- rotated time
- revoked time and reason
- reuse-detected time when applicable

The database stores verifier hashes only. Raw refresh tokens are returned once to the client and cannot be reconstructed from storage.

### 4. How does one IsKool login obtain APS and/or SAMS scoped access?

The user submits credentials once to the IsKool sign-in endpoint. The server verifies the password, validates the requested active school, resolves active membership and roles, then issues only the service-scoped credentials the user is authorized to use.

If a user is allowed into both products, the response may include both APS and SAMS access tokens, each with its own issuer, audience, scope, and signing key. If the user is only allowed into one product, only that product's credential is issued.

### 5. Who signs APS tokens?

The APS API signs APS access tokens with the APS signing key, either directly during APS-scoped issuance or through a tightly bounded internal issuance operation. SAMS cannot produce a token that APS accepts unless it uses the APS issuance boundary and the APS signing key remains available only to APS-authorized server runtime.

### 6. Who signs SAMS tokens?

The SAMS API signs SAMS access tokens with the SAMS signing key. APS cannot sign SAMS tokens.

### 7. How are signing keys separated?

APS and SAMS use separate environment-provided signing keys. The keys have distinct environment variable names, are deployed only to the runtime that needs them, and are never committed.

A compromise of the APS signing key must not allow signing SAMS tokens, and a compromise of the SAMS signing key must not allow signing APS tokens. Verification configuration also remains service-specific: APS validates only APS issuer/audience/scope and the APS verification key; SAMS validates only SAMS issuer/audience/scope and the SAMS verification key.

### 8. How is active school selected?

The client may request a school as a preference, but it is not trusted as authorization. The server treats it as an input to validate. If no school is requested and the user has exactly one active membership, the server may select that membership. If the user has multiple active memberships, the user must select one before service-scoped tokens are issued.

School switching is an authenticated operation that creates a new active session context after validating the target membership. It does not mutate the prior session into a different tenant without server verification.

### 9. How is membership validated?

The server validates that:

- the user exists and is active
- the school exists and is active
- the membership belongs to the user and school
- the membership status is active
- the requested service is allowed for the resolved role set

Validation uses database state, not token claims supplied by the client. An inactive membership fails before token issuance and before RLS principal construction.

### 10. How are membership roles resolved?

Roles are resolved from `membership_roles` joined to `roles` for the validated `membership_id`. A role granted in one school does not apply to another school. Token role claims, if present, are server-issued hints for fast application checks; the database remains authoritative and RLS still receives the membership-scoped principal.

### 11. How does logout revoke sessions?

Logout marks the active refresh session or session family revoked in the database. After logout, refresh attempts for that session fail. Access tokens remain short-lived and are not treated as revocable long-lived sessions.

Logout-all-devices revokes all refresh session families for the user. Product-specific logout may revoke only the relevant session family if the UX requires it, but the first VIM-48 implementation should prefer explicit whole-session logout unless product-scoped logout is needed.

### 12. How does refresh rotation/reuse detection work?

Each refresh request must present the current opaque refresh credential. The server hashes/verifies it against the current stored verifier hash. On success, the server rotates by storing a new verifier hash and returns a new opaque refresh credential plus a new short-lived access token.

If an old refresh credential is presented after rotation, reuse is detected. The server revokes the token family and rejects the request. This must be tested explicitly because it is the control that limits replay after refresh-token theft.

Expired or revoked refresh credentials fail with the standard authentication error envelope and do not disclose whether the user, session, or token family exists.

### 13. How will the future Next.js frontend consume this securely?

The future Next.js frontend will call a single IsKool sign-in flow and store refresh credentials only in secure, httpOnly, sameSite cookies issued by the server. Browser JavaScript must not persist access or refresh tokens in localStorage.

The frontend will request product access through backend endpoints or same-origin routes that attach the correct service-scoped credential server-side. If browser-held access tokens are temporarily required during development, they must be short-lived, memory-only, and replaced by cookie-backed server mediation before production.

The frontend never supplies trusted roles or tenant authority. It may request a school switch, but the backend validates the target membership before issuing a new context.

## Auth to RLS Bridge

After service token verification, the application constructs a server-trusted principal:

- `userId`
- `schoolId`
- `membershipId`
- `requestId`

Tenant-scoped persistence must run through `TransactionService.runWithPrincipal()`. This is the boundary where authentication meets PostgreSQL RLS. Controllers and services must not bypass it for tenant-sensitive reads or writes.

## API and Error Semantics

Authentication failures return `401` with the standard error envelope. Authorization failures after a valid identity return `403`. Login must avoid useful account enumeration: unknown email, bad password, disabled credentials, and invalid refresh tokens use consistent external error semantics while preserving internal audit signals.

Auth events are observable without logging secrets. Logs may record event type, request id, user id after verification, service scope, school id, membership id, and failure category. Logs must not record passwords, access tokens, refresh tokens, raw verifier values, or signing keys.

## Alternatives Considered

### Supabase Auth

Rejected for VIM-48. The existing tenant/RLS model depends on IsKool-owned memberships and transaction-local PostgreSQL settings, not Supabase JWT helpers.

### One shared APS/SAMS bearer token

Rejected by ADR-0005. A shared token widens blast radius and allows accidental cross-service acceptance.

### Passwords on memberships

Rejected. Credentials belong to global user identity. Memberships represent school context and role authority.

### Client-selected roles or tenant context

Rejected. Client input can request a context, but only server-validated membership and role data can authorize it.

## Consequences

- APS and SAMS remain independently deployable and independently verifiable.
- Signing key compromise is service-scoped.
- Refresh-token theft has a rotation/reuse detection response.
- The frontend can present one login without creating a universal unrestricted bearer token.
- Authentication implementation must include integration tests for token replay rejection, refresh rotation, logout, school switching, membership validation, role resolution, and the Auth-to-RLS bridge.
