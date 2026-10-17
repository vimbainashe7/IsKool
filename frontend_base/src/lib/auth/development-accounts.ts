import "server-only"

// The local launcher supplies this marker only when binding Next to loopback.
// Request headers alone are not evidence that the server runs locally.
export function developmentAccountsEnabled(
  headers: Pick<Headers, "get">,
  env: NodeJS.ProcessEnv = process.env
) {
  const host = headers.get("host") ?? ""
  const forwardedHost = headers.get("x-forwarded-host")
  return (
    env.NODE_ENV === "development" &&
    env.ISKOOL_DEV_ACCOUNTS === "true" &&
    env.ISKOOL_DEV_LOOPBACK === "127.0.0.1" &&
    !env.VERCEL && !env.VERCEL_ENV && !env.CF_PAGES && !env.RAILWAY_ENVIRONMENT &&
    !env.CI &&
    !headers.get("forwarded") && (!forwardedHost || forwardedHost === host) &&
    /^(localhost|127\.0\.0\.1):3000$/.test(host)
  )
}
