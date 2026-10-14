import { requestJson, expectStatus, pass } from './helpers/http.mjs';
import { assertHealthyApis, defaultApsBaseUrl, defaultSamsBaseUrl } from './helpers/preflight.mjs';

const samsBaseUrl = defaultSamsBaseUrl;
const apsBaseUrl = defaultApsBaseUrl;
const password = process.env.DEV_SEED_PASSWORD;

async function login(email, schoolId) {
  const result = await requestJson('POST', `${samsBaseUrl}/auth/login`, {
    body: { email, password, ...(schoolId ? { schoolId } : {}) }
  });
  expectStatus(`login ${email}`, result, 201);
  return result.body;
}

async function main() {
  if (!password) {
    throw new Error('DEV_SEED_PASSWORD is required for smoke:auth.');
  }

  await assertHealthyApis();

  expectStatus('SAMS health', await requestJson('GET', `${samsBaseUrl}/health/live`), 200);
  pass('SAMS health');
  expectStatus('APS health', await requestJson('GET', `${apsBaseUrl}/health/live`), 200);
  pass('APS health');

  const invalid = await requestJson('POST', `${samsBaseUrl}/auth/login`, {
    body: { email: 'admin.alpha@example.test', password: 'not-the-password' }
  });
  expectStatus('invalid password', invalid, 401);
  pass('invalid password');

  const sessionA = await login('admin.alpha@example.test');
  if (!sessionA.accessTokens?.sams || !sessionA.accessTokens?.aps || !sessionA.refreshToken) {
    throw new Error('login did not return SAMS token, APS token, and refresh token.');
  }
  pass('login');

  const samsMe = await requestJson('GET', `${samsBaseUrl}/auth/me`, { token: sessionA.accessTokens.sams });
  expectStatus('SAMS token', samsMe, 200);
  pass('SAMS token');

  const apsMe = await requestJson('GET', `${apsBaseUrl}/auth/me`, { token: sessionA.accessTokens.aps });
  expectStatus('APS token', apsMe, 200);
  pass('APS token');

  expectStatus(
    'APS token rejection by SAMS',
    await requestJson('GET', `${samsBaseUrl}/auth/me`, { token: sessionA.accessTokens.aps }),
    401
  );
  pass('APS token rejection');

  expectStatus(
    'SAMS token rejection by APS',
    await requestJson('GET', `${apsBaseUrl}/auth/me`, { token: sessionA.accessTokens.sams }),
    401
  );
  pass('SAMS token rejection');

  const refreshed = await requestJson('POST', `${samsBaseUrl}/auth/refresh`, {
    body: { refreshToken: sessionA.refreshToken }
  });
  expectStatus('refresh', refreshed, 200);
  if (!refreshed.body.accessTokens?.sams || !refreshed.body.accessTokens?.aps || !refreshed.body.refreshToken) {
    throw new Error('refresh did not rotate and return service tokens.');
  }
  pass('refresh');

  expectStatus(
    'refresh rotation rejects old token',
    await requestJson('POST', `${samsBaseUrl}/auth/refresh`, { body: { refreshToken: sessionA.refreshToken } }),
    401
  );
  pass('refresh rotation');

  const sessionB = await login('admin.alpha@example.test');
  expectStatus(
    'logout',
    await requestJson('POST', `${samsBaseUrl}/auth/logout`, { token: sessionB.accessTokens.sams }),
    200
  );
  pass('logout');

  expectStatus(
    'post-logout refresh rejection',
    await requestJson('POST', `${samsBaseUrl}/auth/refresh`, { body: { refreshToken: sessionB.refreshToken } }),
    401
  );
  pass('post-logout refresh rejection');

  const selection = await requestJson('POST', `${samsBaseUrl}/auth/login`, {
    body: { email: 'multi.school@example.test', password }
  });
  expectStatus('multi-school selection', selection, 201);
  if (selection.body.status !== 'SCHOOL_SELECTION_REQUIRED' || selection.body.schools.length !== 2) {
    throw new Error('multi-school login did not require explicit school selection.');
  }
  pass('multi-school selection');

  for (const school of selection.body.schools) {
    const scoped = await login('multi.school@example.test', school.id);
    const me = await requestJson('GET', `${samsBaseUrl}/auth/me`, { token: scoped.accessTokens.sams });
    expectStatus(`multi-school ${school.name}`, me, 200);
    const expectedRoles = [...school.roles].sort().join(',');
    const actualRoles = [...me.body.roles].sort().join(',');
    if (actualRoles !== expectedRoles) {
      throw new Error(`role leakage for ${school.name}: expected ${expectedRoles}, received ${actualRoles}`);
    }
  }
  pass('multi-school role isolation');
}

main().catch((error) => {
  console.error(`FAIL smoke:auth - ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
