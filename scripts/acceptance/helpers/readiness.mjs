// Database readiness and process liveness answer different questions. Never use
// this to claim readiness; it only avoids killing a live API during an outage.
export async function frontendRoutesReady(signInUrl, fetcher = fetch) {
  try {
    // Login only supports POST. GET must return 405, proving its route exists
    // without attempting authentication, creating sessions or changing data.
    const response = await fetcher(new URL('/api/auth/login', signInUrl).href, { signal: AbortSignal.timeout(30000), redirect: 'manual' });
    return response.status === 405;
  } catch { return false; }
}

export async function backendIsLive(service, fetcher = fetch) {
  if (!['aps', 'sams'].includes(service.kind)) return false;
  try {
    const response = await fetcher(service.url.replace(/\/ready$/, '/live'), { signal: AbortSignal.timeout(3000), redirect: 'manual' });
    return response.ok && (await response.json()).status === 'ok';
  } catch { return false; }
}
