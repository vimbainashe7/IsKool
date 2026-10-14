import { Request } from 'express';
import { AuthPrincipal } from '@aps-sams/auth';

export type AuthenticatedRequest = Request & {
  authPrincipal?: AuthPrincipal;
  user?: { sub?: string };
};
