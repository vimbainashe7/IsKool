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

export class BusinessRuleError extends ApplicationError {
  constructor(code: string, message: string) {
    super(code, message, 422);
  }
}
