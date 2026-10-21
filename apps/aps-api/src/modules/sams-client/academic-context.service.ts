import { Injectable } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { ContextQuery } from '@aps-sams/sams-contracts';
import {
  BusinessRuleError,
  PermissionDeniedError,
  ResourceNotFoundError
} from '../../common/errors/application-error';
import { SamsClient } from './sams.client';
@Injectable()
export class AcademicContextService {
  constructor(private readonly sams: SamsClient) {}
  async read(p: AuthPrincipal, r: string, token: string, q: ContextQuery) {
    if (p.scope !== 'aps' || !p.roles.includes(q.role))
      throw new PermissionDeniedError();
    if (q.classId && q.cursor)
      throw new BusinessRuleError(
        'INVALID_CONTEXT_FILTER',
        'Class details cannot be combined with a page cursor.'
      );
    const context = await this.sams.getAuthorizedContext(
      { principal: p, token, requestId: r },
      q
    );
    if (q.classId && !context.classes.length)
      throw new ResourceNotFoundError(
        'Class not found in your authorized school records.'
      );
    return context;
  }
}
