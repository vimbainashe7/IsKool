# Migration Safety

Rules:

- Use Prisma Migrate in API repositories.
- Validate schema before build.
- Forward-safe migrations only by default.
- Destructive migrations require an explicit written plan.
- Add uniqueness and foreign keys in the database, not only in application code.
- Avoid slow network calls inside database transactions.
- Document isolation-level choices for financial paths.
- Prefer additive migrations followed by backfill and cleanup.
