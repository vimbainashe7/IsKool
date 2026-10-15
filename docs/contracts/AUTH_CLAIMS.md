# Authentication Claims

APS access token:

```json
{
  "sub": "<user-id>",
  "roles": ["student"],
  "scope": "aps",
  "iss": "aps-api",
  "aud": "aps",
  "iat": 0,
  "exp": 0
}
```

SAMS access token:

```json
{
  "sub": "<user-id>",
  "roles": ["registrar"],
  "scope": "sams",
  "iss": "sams-api",
  "aud": "sams",
  "iat": 0,
  "exp": 0
}
```

Rules:

- APS and SAMS use separate signing keys/secrets.
- Wrong scope is rejected.
- Wrong issuer is rejected.
- Wrong audience is rejected.
- Roles are resolved server-side before token issue.
- Access tokens are short-lived.
- Refresh rotation is planned.
- Passwords use Argon2id.
- Privileged SAMS actions have an extension point for re-authentication or second approval.
