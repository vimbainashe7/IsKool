# Storage Security

## Buckets

- `assignment-submissions`: private.
- `teacher-materials`: private.

Both buckets are created in `supabase/migrations/202609290001_iskool_auth_rls_foundation.sql`.

## Object Paths

The browser never uses arbitrary filenames as object keys. Upload components generate UUID file names and paths with authorization context:

```text
schools/{schoolId}/classes/{classId}/assignments/{assignmentId}/students/{userId}/{uuid}.{ext}
schools/{schoolId}/classes/{classId}/materials/{userId}/{uuid}.{ext}
```

Original filenames are preserved separately in `submissions.original_filename` or `materials.original_filename`.

## Current Frontend Status

- Student upload screen: `/student/assignments/[assignmentId]`.
- Teacher material upload screen: `/teacher/materials`.
- Production upload/download services remain disabled pending VIM-59. Existing object policies permit school-wide reads despite private buckets.

## Backend Blockers

The frontend resolves assignment/class/teacher scope from validated server data. File UI supports picker/drop, size/type/empty-file validation, progress, retry/cancel/replace/remove, preview and confirmation. Submitted appears only after a persisted server record/timestamp. Teacher resources distinguish draft/published/archived.

Development uploads save actual binaries under ignored .cache using UUID names and separate original-name/reservation metadata. Finalization checks actor/class/assignment ownership. Downloads check the visible resource and session scope. Fixture downloads are named sample resources. This is not hardened ingestion; production requires signature checks, quarantine/scanning, atomic finalization and independently authorized signed reads. Unreferenced canceled/replaced preview files remain until local cache cleanup. See BACKEND_CONTRACTS.md.
