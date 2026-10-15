import { ServiceScope } from '@aps-sams/auth';

export interface RoleAssignment {
  readonly key: string;
}

export interface ActiveMembership {
  readonly id: string;
  readonly schoolId: string;
  readonly schoolName: string;
  readonly roles: readonly RoleAssignment[];
}

export interface LoginCandidate {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly status: string;
  readonly passwordHash: string | null;
  readonly credentialDisabledAt: Date | null;
  readonly activeMemberships: readonly ActiveMembership[];
}

export interface IssuedAuthSession {
  readonly sessionId: string;
  readonly refreshToken: string;
  readonly refreshTokenId: string;
}

export interface RotatedRefreshSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly schoolId: string;
  readonly membershipId: string;
  readonly roles: readonly string[];
  readonly allowedScopes: readonly ServiceScope[];
}

export interface LoginResponse {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
  };
  readonly school: {
    readonly id: string;
    readonly name: string;
  };
  readonly membershipId: string;
  readonly roles: readonly string[];
  readonly allowedScopes: readonly ServiceScope[];
  readonly accessTokens: Partial<Record<ServiceScope, string>>;
  readonly refreshToken: string;
}

export interface RefreshResponse {
  readonly accessToken?: string;
  readonly accessTokens: Partial<Record<ServiceScope, string>>;
  readonly refreshToken: string;
}

export interface SchoolSelectionResponse {
  readonly status: 'SCHOOL_SELECTION_REQUIRED';
  readonly continuationToken: string;
  readonly expiresAt: string;
  readonly schools: readonly {
    readonly id: string;
    readonly name: string;
    readonly roles: readonly string[];
    readonly allowedScopes: readonly ServiceScope[];
  }[];
}
