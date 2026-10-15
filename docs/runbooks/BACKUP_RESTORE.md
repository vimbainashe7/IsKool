# Backup and Restore

Target policy for API repositories:

- Daily full PostgreSQL backup.
- Point-in-time recovery strategy appropriate to the production PostgreSQL/Supabase deployment.
- Thirty days of daily backups.
- Seven days of point-in-time recovery where supported by the deployment tier.
- Off-host and off-region storage.
- Monthly restore drill to staging.
- Restore verification against known records.

Financial records must follow jurisdiction-specific retention requirements.
