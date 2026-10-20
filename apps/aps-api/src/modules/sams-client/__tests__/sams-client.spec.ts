import { randomBytes } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { AuthPrincipal, InternalReadTokenService } from '@aps-sams/auth';
import { SamsClient } from '../sams.client';
const secret = randomBytes(32);
const principal: AuthPrincipal = {
  userId: 'a2000000-0000-4000-8000-000000000004',
  sessionId: 'session',
  tokenId: 'token',
  schoolId: 'a1000000-0000-4000-8000-000000000001',
  membershipId: 'a3000000-0000-4000-8000-000000000004',
  roles: ['student'],
  scope: 'aps'
};
const actor = {
  principal,
  token: 'private-actor-token',
  requestId: 'correlation-123'
};
const settings = {
  enabled: true,
  baseUrl: 'http://127.0.0.1:3003/internal/v1',
  serviceKey: secret.toString('base64url'),
  timeoutMs: 2000,
  environment: 'test'
};
const context = {
  version: 1,
  schoolId: principal.schoolId,
  membershipId: principal.membershipId,
  role: 'student',
  asOf: new Date().toISOString(),
  student: null,
  classes: [],
  totalClasses: 0,
  nextCursor: null
};
const original = global.fetch;
beforeEach(() =>
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
);
afterEach(() => {
  global.fetch = original;
  jest.restoreAllMocks();
});
describe('typed APS SAMS read adapter', () => {
  it('propagates request/actor identity, uses separate service authentication and accepts genuine zero', async () => {
    const fetcher = jest.fn().mockResolvedValue(Response.json(context));
    global.fetch = fetcher;
    await expect(
      new SamsClient(settings).getAuthorizedContext(actor, {
        role: 'student',
        limit: 25
      })
    ).resolves.toEqual(context);
    const options = fetcher.mock.calls[0][1];
    expect(options.redirect).toBe('error');
    expect(options.method).toBe('GET');
    expect(options.headers['x-request-id']).toBe(actor.requestId);
    expect(options.headers['x-iskool-actor-token']).toBe(actor.token);
    await expect(
      new InternalReadTokenService(secret).verify(
        options.headers.authorization.slice(7)
      )
    ).resolves.toEqual({ clientId: 'aps-api', scope: 'sams:context:read' });
  });
  it('retries a failed idempotent read once with the same correlation ID', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json(context));
    global.fetch = fetcher;
    await new SamsClient(settings).getAuthorizedContext(actor, {
      role: 'student',
      limit: 25
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      fetcher.mock.calls.map((call) => call[1].headers['x-request-id'])
    ).toEqual([actor.requestId, actor.requestId]);
  });
  it('does not retry authorization, validation or inaccessible-resource responses', async () => {
    for (const status of [401, 403, 404, 422]) {
      const fetcher = jest
        .fn()
        .mockResolvedValue(new Response(null, { status }));
      global.fetch = fetcher;
      await expect(
        new SamsClient(settings).getAuthorizedContext(actor, {
          role: 'student',
          limit: 25
        })
      ).rejects.toMatchObject({ status: status === 404 ? 404 : 502 });
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
  it('fails closed on timeouts, foreign identities and malformed provider data', async () => {
    const unavailable = jest
      .fn()
      .mockRejectedValue(new DOMException('aborted', 'AbortError'));
    global.fetch = unavailable;
    await expect(
      new SamsClient(settings).getAuthorizedContext(actor, {
        role: 'student',
        limit: 25
      })
    ).rejects.toMatchObject({ status: 503 });
    expect(unavailable).toHaveBeenCalledTimes(2);
    for (const body of [
      { ...context, schoolId: 'a1000000-0000-4000-8000-000000000002' },
      { classes: [] }
    ]) {
      const fetcher = jest.fn().mockResolvedValue(Response.json(body));
      global.fetch = fetcher;
      await expect(
        new SamsClient(settings).getAuthorizedContext(actor, {
          role: 'student',
          limit: 25
        })
      ).rejects.toMatchObject({ status: 502 });
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
  it('rejects insecure remote configuration and disabled reads never fetch', async () => {
    expect(
      () =>
        new SamsClient({
          ...settings,
          environment: 'production',
          baseUrl: 'http://school.example/internal/v1'
        })
    ).toThrow();
    const fetcher = jest.fn();
    global.fetch = fetcher;
    await expect(
      new SamsClient({ ...settings, enabled: false }).getAuthorizedContext(
        actor,
        { role: 'student', limit: 25 }
      )
    ).rejects.toMatchObject({ status: 503 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
