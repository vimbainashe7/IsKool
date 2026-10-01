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
- Uploads go directly to private Supabase Storage using the authenticated browser client.

## Backend Blockers

The frontend currently uses placeholder class ids on upload screens. The backend must resolve assignment-to-class and teacher class selection from RLS-protected data before production.
