# Packages

Shared packages must stay small and intentional.

Allowed package categories:

- `contracts`: cross-system contract types and shared error identifiers where genuinely shared.
- `config`: shared lint, TypeScript, or test configuration.
- `design-tokens`: future frontend design tokens.

Do not add a shared business-logic package that bypasses APS/SAMS domain ownership.
