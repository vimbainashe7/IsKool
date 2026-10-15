export const serviceScopes = ['aps', 'sams'] as const;

export type ServiceScope = (typeof serviceScopes)[number];

export interface ServiceTokenProfile {
  readonly issuer: string;
  readonly audience: ServiceScope;
  readonly scope: ServiceScope;
}

export const serviceTokenProfiles: Record<ServiceScope, ServiceTokenProfile> = {
  aps: {
    issuer: 'aps-api',
    audience: 'aps',
    scope: 'aps'
  },
  sams: {
    issuer: 'sams-api',
    audience: 'sams',
    scope: 'sams'
  }
};

export function isServiceScope(value: unknown): value is ServiceScope {
  return value === 'aps' || value === 'sams';
}
