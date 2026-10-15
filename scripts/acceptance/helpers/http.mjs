export async function requestJson(method, url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        accept: 'application/json',
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers ?? {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (error) {
    throw new Error(
      `${method} ${url} failed. If this is an API smoke test, start the backend with npm run dev:backend and wait for health. Cause: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  let body = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { status: response.status, ok: response.ok, body };
}

export function expectStatus(label, result, status) {
  if (result.status !== status) {
    throw new Error(`${label}: expected HTTP ${status}, received ${result.status}: ${JSON.stringify(result.body)}`);
  }
}

export function pass(label) {
  console.log(`PASS ${label}`);
}
