import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { AuthPrincipal, InternalReadTokenService } from '@aps-sams/auth';
import {
  ActiveMembership,
  ClassMembership,
  ContextQuery,
  CurrentEnrollments,
  parseContext,
  parseReadPayload,
  SamsContractError,
  StudentProfile,
  TeachingAuthority
} from '@aps-sams/sams-contracts';
import { samsInternalConfig } from '../../config/sams-internal.config';
import {
  ApplicationError,
  ResourceNotFoundError
} from '../../common/errors/application-error';
export interface SamsActor {
  principal: AuthPrincipal;
  token: string;
  requestId: string;
}
const unavailable = () =>
  new ApplicationError(
    'SAMS_UNAVAILABLE',
    'School class context is temporarily unavailable. Please retry.',
    503
  );
const invalid = () =>
  new ApplicationError(
    'SAMS_INVALID_RESPONSE',
    'School class context could not be verified. Please retry.',
    502
  );
@Injectable()
export class SamsClient {
  private readonly logger = new Logger('SamsClient');
  private readonly credentials?: InternalReadTokenService;
  private readonly base?: string;
  constructor(
    @Inject(samsInternalConfig.KEY)
    private readonly settings: ConfigType<typeof samsInternalConfig>
  ) {
    if (!settings.enabled) return;
    if (
      !settings.serviceKey ||
      !/^[A-Za-z0-9_-]{43,86}$/.test(settings.serviceKey)
    )
      throw new Error('A separate SAMS_INTERNAL_SERVICE_KEY is required.');
    this.credentials = new InternalReadTokenService(
      Buffer.from(settings.serviceKey, 'base64url')
    );
    const url = new URL(settings.baseUrl ?? '');
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.hash ||
      url.search ||
      url.pathname.replace(/\/$/, '') !== '/internal/v1' ||
      !(
        url.protocol === 'https:' ||
        (url.protocol === 'http:' &&
          local &&
          settings.environment !== 'production')
      ) ||
      settings.timeoutMs < 100 ||
      settings.timeoutMs > 10000
    )
      throw new Error(
        'Invalid private SAMS read URL or timeout configuration.'
      );
    this.base = url.toString().replace(/\/$/, '');
  }
  getAuthorizedContext(actor: SamsActor, query: ContextQuery) {
    const params = new URLSearchParams({
      role: query.role,
      limit: String(query.limit)
    });
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.classId) params.set('classId', query.classId);
    return this.read(actor, `context?${params}`, 'context', (body) =>
      parseContext(
        body,
        actor.principal.schoolId,
        actor.principal.membershipId,
        query.role
      )
    );
  }
  getStudentProfile(actor: SamsActor, id: string) {
    return this.read(
      actor,
      `students/${encodeURIComponent(id)}/profile`,
      'student-profile',
      (body) => this.scoped(StudentProfile, body, actor, { id })
    );
  }
  getCurrentEnrollments(
    actor: SamsActor,
    id: string,
    query: { limit: number; cursor?: string } = { limit: 25 }
  ) {
    const params = new URLSearchParams({ limit: String(query.limit) });
    if (query.cursor) params.set('cursor', query.cursor);
    return this.read(
      actor,
      `students/${encodeURIComponent(id)}/enrollments/current?${params}`,
      'current-enrollments',
      (body) => this.scoped(CurrentEnrollments, body, actor, { studentId: id })
    );
  }
  async assertClassMembership(
    actor: SamsActor,
    classId: string,
    studentId: string
  ): Promise<void> {
    await this.read(
      actor,
      `classes/${encodeURIComponent(classId)}/members/${encodeURIComponent(studentId)}`,
      'class-membership',
      (body) =>
        this.scoped(ClassMembership, body, actor, { classId, studentId })
    );
  }
  async assertTeachingAuthority(
    actor: SamsActor,
    classId: string
  ): Promise<void> {
    await this.read(
      actor,
      `classes/${encodeURIComponent(classId)}/teaching-authority`,
      'teaching-authority',
      (body) =>
        this.scoped(TeachingAuthority, body, actor, {
          classId,
          membershipId: actor.principal.membershipId
        })
    );
  }
  getCurrentMembership(actor: SamsActor) {
    return this.read(
      actor,
      'memberships/current',
      'active-membership',
      (body) =>
        this.scoped(ActiveMembership, body, actor, {
          membershipId: actor.principal.membershipId
        })
    );
  }
  private scoped<T extends { schoolId: string }>(
    type: new () => T,
    body: unknown,
    actor: SamsActor,
    expected: Partial<T>
  ): T {
    const value = parseReadPayload(type, body);
    if (
      value.schoolId !== actor.principal.schoolId ||
      Object.entries(expected).some(
        ([key, wanted]) => Reflect.get(value, key) !== wanted
      )
    )
      throw new SamsContractError();
    return value;
  }
  private async read<T>(
    actor: SamsActor,
    path: string,
    operation: string,
    parse: (body: unknown) => T
  ): Promise<T> {
    if (!this.credentials || !this.base) throw unavailable();
    for (let attempt = 0; attempt < 2; attempt++) {
      const start = Date.now();
      let status: number | 'network' = 'network';
      try {
        const response = await fetch(`${this.base}/${path}`, {
          method: 'GET',
          redirect: 'error',
          cache: 'no-store',
          signal: AbortSignal.timeout(this.settings.timeoutMs),
          headers: {
            authorization: `Bearer ${await this.credentials.sign()}`,
            'x-iskool-actor-token': actor.token,
            'x-request-id': actor.requestId
          }
        });
        status = response.status;
        if (!response.ok) {
          await response.body?.cancel();
          if (response.status >= 500) {
            if (attempt === 0) {
              await this.jitter();
              continue;
            }
            throw unavailable();
          }
          if (response.status === 404)
            throw new ResourceNotFoundError(
              'This school resource is not available to your account.'
            );
          throw new ApplicationError(
            'SAMS_AUTHORIZATION_FAILED',
            'School class context could not be authorized.',
            502
          );
        }
        return parse(await this.readJson(response));
      } catch (error) {
        if (error instanceof ApplicationError) throw error;
        if (error instanceof SamsContractError) throw invalid();
        if (attempt === 1) throw unavailable();
        await this.jitter();
      } finally {
        this.logger.log(
          JSON.stringify({
            dependency: 'sams',
            operation,
            requestId: actor.requestId,
            status,
            attempt: attempt + 1,
            latencyMs: Date.now() - start
          })
        );
      }
    }
    throw unavailable();
  }
  private jitter() {
    return new Promise((resolve) =>
      setTimeout(resolve, 25 + Math.floor(Math.random() * 50))
    );
  }
  private async readJson(response: Response): Promise<unknown> {
    if (
      !response.headers.get('content-type')?.includes('application/json') ||
      !response.body
    )
      throw new SamsContractError();
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 256 * 1024) {
          await reader.cancel();
          throw new SamsContractError();
        }
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    } catch {
      throw new SamsContractError();
    }
  }
}
