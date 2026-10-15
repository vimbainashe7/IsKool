# Error Contract

Standard shape:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found.",
    "status": 404,
    "requestId": "..."
  }
}
```

Status discipline:

- `400`: malformed request
- `401`: invalid or expired authentication
- `403`: valid authentication but insufficient permission
- `404`: missing resource or deliberately hidden inaccessible resource
- `409`: conflict
- `422`: business-rule failure

Responses must not leak SQL, stack traces, secrets, internal paths, or storage details.
