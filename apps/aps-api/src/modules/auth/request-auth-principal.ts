import { Request } from 'express';
import { AuthPrincipal } from '@aps-sams/auth';

export interface AuthenticatedRequest extends Request {
  authPrincipal?: AuthPrincipal;
  user?: { sub: string };
}
