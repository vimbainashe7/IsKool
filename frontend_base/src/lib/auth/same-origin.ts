import "server-only"

// Next development normalizes request.url to localhost even when the browser
// uses 127.0.0.1. Permit that alias only on our explicitly loopback-bound server.
export function isSameOrigin(request: Request, env: NodeJS.ProcessEnv = process.env) {
  const origin = request.headers.get("origin")
  if (origin === new URL(request.url).origin) return true
  const host = request.headers.get("host") ?? ""
  const forwardedHost = request.headers.get("x-forwarded-host")
  return env.NODE_ENV === "development" && env.ISKOOL_DEV_LOOPBACK === "127.0.0.1" &&
    !env.VERCEL && !env.VERCEL_ENV && !env.CF_PAGES && !env.RAILWAY_ENVIRONMENT &&
    /^(localhost|127\.0\.0\.1):3000$/.test(host) &&
    !request.headers.get("forwarded") && (!forwardedHost || forwardedHost === host) &&
    origin === `http://${host}`
}
