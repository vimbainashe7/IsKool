import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'crypto';
import { JsonLogger } from '../logging/logger.service';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly logger: JsonLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string; user?: { sub?: string } }>();
    const response = http.getResponse<Response>();
    const start = Date.now();
    const inbound = request.header('x-request-id');
    const requestId = inbound && inbound.length <= 128 ? inbound : randomUUID();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      tap({
        next: () => this.logRequest(request, response, start),
        error: () => this.logRequest(request, response, start)
      })
    );
  }

  private logRequest(
    request: Request & { requestId?: string; user?: { sub?: string } },
    response: Response,
    start: number
  ): void {
    const latencyMs = Date.now() - start;
    const route = request.route?.path ? String(request.route.path) : request.path;
    this.logger.log(
      JSON.stringify({
        requestId: request.requestId,
        method: request.method,
        route,
        status: response.statusCode,
        latencyMs,
        userId: request.user?.sub
      }),
      'http'
    );
    if (latencyMs > 1000) {
      this.logger.warn(`Slow request ${request.method} ${route} ${latencyMs}ms`, 'http');
    }
  }
}
