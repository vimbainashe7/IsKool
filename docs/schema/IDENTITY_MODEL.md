# Identity Model

Revision 2.0 describes `users`, `roles`, and `user_roles` as a many-to-many model, but table examples show `assignment_id` as the `user_roles` primary key.

Foundation proposal:

```sql
PRIMARY KEY (user_id, role_id)
```

Alternative:

```sql
user_role_id BIGINT PRIMARY KEY
UNIQUE (user_id, role_id)
```

The composite key is preferred until the team identifies a need to address individual assignments as first-class resources.

## Conceptual Tables

`users`

- `user_id`
- `email`
- `password_hash`
- `created_at`
- `updated_at`

`roles`

- `role_id`
- `code`
- `display_name`
- `system_scope` constrained to `aps`, `sams`, or `both`
- `created_at`
- `updated_at`

`user_roles`

- `user_id`
- `role_id`
- `assigned_at`
- `assigned_by`
- `revoked_at` nullable if role history is retained in-table
- `revoked_by` nullable

## Constraints

- `users.email` is unique.
- `roles.code` plus `roles.system_scope` is unique.
- `user_roles` prevents duplicate active role assignment.
- Foreign keys enforce `user_roles.user_id -> users.user_id` and `user_roles.role_id -> roles.role_id`.
- Index `user_roles(user_id)`.
- Index `user_roles(role_id)`.

## Security Rules

- Clients never supply trusted roles.
- Roles are resolved server-side.
- Token roles are scoped to the issuing system.
- Role changes are auditable.
- Application behavior must use role constants/enums/policies, not scattered string literals in controllers.
