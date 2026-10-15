# Versioning

All public REST APIs use `/api/v1`.

Do not combine the global prefix with URI versioning in a way that produces `/api/v1/v1`.

Internal service APIs use `/internal/v1` and are not publicly exposed by default.

Breaking changes require a new version or a documented compatibility migration.
