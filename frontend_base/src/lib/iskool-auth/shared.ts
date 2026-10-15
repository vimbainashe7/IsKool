export const iskoolAuthCookies = {
  samsAccess: "iskool-sams-access",
  apsAccess: "iskool-aps-access",
  refresh: "iskool-refresh",
} as const

export function isIsKoolAuthConfigured() {
  return Boolean(
    process.env.ISKOOL_SAMS_API_URL && process.env.ISKOOL_APS_API_URL
  )
}

export function getIsKoolApiUrls() {
  const sams = process.env.ISKOOL_SAMS_API_URL
  const aps = process.env.ISKOOL_APS_API_URL
  if (!sams || !aps) throw new Error("IsKool API URLs are not configured.")
  return { sams: sams.replace(/\/$/, ""), aps: aps.replace(/\/$/, "") }
}

export const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 15 * 60,
}

export const refreshCookieOptions = {
  ...accessCookieOptions,
  maxAge: 14 * 24 * 60 * 60,
}
