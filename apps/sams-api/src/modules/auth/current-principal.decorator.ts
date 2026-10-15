import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { AuthenticatedRequest } from './request-auth-principal';

export const CurrentPrincipal = createParamDecorator((_data: unknown, context: ExecutionContext): AuthPrincipal => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.authPrincipal) {
    throw new Error('AuthPrincipal was not attached to the request.');
  }
  return request.authPrincipal;
});
