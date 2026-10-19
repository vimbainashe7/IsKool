import assert from 'node:assert/strict';
import test from 'node:test';
import { backendIsLive, frontendRoutesReady } from './helpers/readiness.mjs';

test('a rendered sign-in page is insufficient when the login route is missing', async () => {
  for (const status of [404,500,503]) assert.equal(await frontendRoutesReady('http://127.0.0.1:3000/sign-in', async () => ({status})),false);
  assert.equal(await frontendRoutesReady('http://127.0.0.1:3000/sign-in', async () => ({status:405})),true);
  assert.equal(await frontendRoutesReady('http://127.0.0.1:3000/sign-in', async () => {throw new Error('offline')}),false);
});

test('degraded database can coexist with a verified live backend', async () => {
  let requested;
  const live = await backendIsLive({ kind: 'sams', url: 'http://127.0.0.1:3002/api/v1/health/ready' }, async (url) => {
    requested = url;
    return { ok: true, json: async () => ({ status: 'ok' }) };
  });
  assert.equal(live, true);
  assert.equal(requested, 'http://127.0.0.1:3002/api/v1/health/live');
});

test('unreachable, non-successful or malformed liveness never preserves a failed process', async () => {
  const service = { kind: 'aps', url: 'http://127.0.0.1:3001/api/v1/health/ready' };
  for (const probe of [
    async () => { throw new Error('connection refused'); },
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ status: 'degraded' }) }),
    async () => ({ ok: true, json: async () => { throw new Error('invalid JSON'); } }),
  ]) assert.equal(await backendIsLive(service, probe), false);
  assert.equal(await backendIsLive({ kind: 'frontend', url: 'http://127.0.0.1:3000/sign-in' }, async () => { throw new Error('must not probe'); }), false);
});
