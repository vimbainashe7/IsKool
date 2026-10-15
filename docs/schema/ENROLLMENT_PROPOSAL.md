# Enrollment Proposal

Revision 2.0 references enrollment and an index but does not fully specify the model.

Proposed SAMS-owned baseline:

- `enrollment_id`
- `student_id`
- `class_id` or cohort/class-section identifier
- `academic_year`
- `term`
- `status`
- `enrolled_at`
- `ended_at` nullable
- `created_at`
- `updated_at`

Suggested uniqueness:

```sql
UNIQUE (student_id, class_id, academic_year, term, enrolled_at)
```

This permits historical transfer/re-enrollment records while preserving a deterministic identity for each enrollment period. A separate filtered/functional uniqueness strategy should ensure only one active enrollment for the same student/class/year/term where the selected database strategy supports it.

Statuses:

- `pending`
- `active`
- `transferred`
- `withdrawn`
- `completed`
- `cancelled`

Required indexes:

- `(student_id, academic_year, term, status)` for current enrollment lookup.
- `(class_id, academic_year, term, status)` for students currently enrolled in class.
- `(student_id, enrolled_at)` for history.
- `(student_id, class_id, academic_year, term)` for APS membership checks.

Behavior:

- Historical records are retained; old rows are not overwritten.
- Transfers close the previous enrollment with `ended_at` and create a new row.
- Re-enrollment creates a new row rather than reviving a previous closed row.
- Active enrollment is represented by `status = active` and `ended_at IS NULL`.
- APS authorization consumes enrollment state from SAMS and does not write enrollments.

Institutional semantics requiring confirmation:

- Whether class changes within a term preserve history or replace current enrollment.
- Whether withdrawn and re-enrolled students reuse a row.
- How multi-campus or combined-class sections are represented.
- Whether `term` is a free value, lookup table, or calendar period FK.
