import { ServiceScope } from './service-scope';

export interface AuthPrincipal {
  readonly userId: string;
  readonly schoolId: string;
  readonly membershipId: string;
  readonly sessionId: string;
  readonly scope: ServiceScope;
  readonly roles: readonly string[];
  readonly tokenId: string;
}

export interface AuthTokenClaims {
  readonly sub: string;
  readonly sid: string;
  readonly school_id: string;
  readonly membership_id: string;
  readonly scope: ServiceScope;
  readonly roles?: readonly string[];
  readonly jti: string;
}
