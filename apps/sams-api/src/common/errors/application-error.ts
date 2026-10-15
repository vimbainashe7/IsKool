export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export class ResourceNotFoundError extends ApplicationError {
  constructor(message = 'Resource not found.') {
    super('RESOURCE_NOT_FOUND', message, 404);
  }
}

export class AuthenticationRequiredError extends ApplicationError {
  constructor(message = 'Authentication is required.') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class PermissionDeniedError extends ApplicationError {
  constructor(message = 'Permission denied.') {
    super('FORBIDDEN', message, 403);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message = 'Resource conflict.') {
    super('CONFLICT', message, 409);
  }
}

export class BusinessRuleError extends ApplicationError {
  constructor(code = 'BUSINESS_RULE_FAILED', message = 'Business rule failed.') {
    super(code, message, 422);
  }
}
