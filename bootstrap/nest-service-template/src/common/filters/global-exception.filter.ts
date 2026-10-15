import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApplicationError } from '../errors/application-error';
import { ErrorResponse } from '../errors/error-response';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId ?? 'unknown';

    const normalized = this.normalize(exception);
    const payload: ErrorResponse = {
      error: {
        code: normalized.code,
        message: normalized.message,
        status: normalized.status,
        requestId
      }
    };

    response.status(normalized.status).json(payload);
  }

  private normalize(exception: unknown): { code: string; message: string; status: number } {
    if (exception instanceof ApplicationError) {
      return { code: exception.code, message: exception.message, status: exception.status };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const message = Array.isArray(body.message) ? 'Request validation failed.' : String(body.message);
        return { code: this.codeForStatus(status), message, status };
      }
      return { code: this.codeForStatus(status), message: exception.message, status };
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      status: HttpStatus.INTERNAL_SERVER_ERROR
    };
  }

  private codeForStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'RESOURCE_NOT_FOUND',
      409: 'CONFLICT',
      422: 'BUSINESS_RULE_FAILED'
    };
    return map[status] ?? 'INTERNAL_SERVER_ERROR';
  }
}
