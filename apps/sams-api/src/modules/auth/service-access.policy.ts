import { Injectable } from '@nestjs/common';
import { ServiceScope } from '@aps-sams/auth';

const roleScopeMap: Record<string, readonly ServiceScope[]> = {
  student: ['aps'],
  teacher: ['aps'],
  registrar: ['sams'],
  finance: ['sams'],
  hr: ['sams'],
  admin: ['aps', 'sams'],
  leadership: ['aps', 'sams']
};

@Injectable()
export class ServiceAccessPolicy {
  scopesForRoles(roles: readonly string[]): readonly ServiceScope[] {
    const scopes = new Set<ServiceScope>();
    for (const role of roles) {
      for (const scope of roleScopeMap[role] ?? []) {
        scopes.add(scope);
      }
    }
    return [...scopes].sort();
  }
}
