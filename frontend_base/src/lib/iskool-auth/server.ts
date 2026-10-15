import "server-only"

import { z } from "zod"

import { getIsKoolApiUrls } from "./shared"

const tokenSetSchema = z.object({
  aps: z.string().min(1).optional(),
  sams: z.string().min(1).optional(),
})

const contextSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().min(1),
  }),
  school: z.object({ id: z.string().uuid(), name: z.string().min(1) }),
  membershipId: z.string().uuid(),
  roles: z.array(z.string().min(1)),
})

const loginSchema = contextSchema.extend({
  allowedScopes: z.array(z.enum(["aps", "sams"])),
  accessTokens: tokenSetSchema,
  refreshToken: z.string().min(1),
})

const selectionSchema = z.object({
  status: z.literal("SCHOOL_SELECTION_REQUIRED"),
  schools: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      roles: z.array(z.string()),
      allowedScopes: z.array(z.enum(["aps", "sams"])),
    })
  ),
})

const refreshSchema = z.object({
  accessTokens: tokenSetSchema,
  refreshToken: z.string().min(1),
})

export type IsKoolTokens = z.infer<typeof tokenSetSchema>
export type IsKoolContextResponse = z.infer<typeof contextSchema>

export class IsKoolAuthError extends Error {
  constructor(
    readonly status: number,
    message = "IsKool authentication request failed."
  ) {
    super(message)
  }
}

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: { "content-type": "application/json", ...init.headers },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new IsKoolAuthError(response.status)
  return body
}

export async function loginWithIsKool(input: {
  email: string
  password: string
  schoolId?: string
}) {
  const { sams } = getIsKoolApiUrls()
  const body = await requestJson(`${sams}/auth/login`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  const selection = selectionSchema.safeParse(body)
  if (selection.success) return selection.data
  return loginSchema.parse(body)
}

export async function refreshIsKoolSession(refreshToken: string) {
  const { sams } = getIsKoolApiUrls()
  return refreshSchema.parse(
    await requestJson(`${sams}/auth/refresh`, {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    })
  )
}

export async function fetchIsKoolContext(tokens: IsKoolTokens) {
  const { sams, aps } = getIsKoolApiUrls()
  const attempts = [
    tokens.sams ? { url: sams, token: tokens.sams } : null,
    tokens.aps ? { url: aps, token: tokens.aps } : null,
  ].filter((attempt): attempt is { url: string; token: string } => Boolean(attempt))

  for (const attempt of attempts) {
    try {
      return contextSchema.parse(
        await requestJson(`${attempt.url}/auth/context`, {
          method: "GET",
          headers: { authorization: `Bearer ${attempt.token}` },
        })
      )
    } catch (error) {
      if (!(error instanceof IsKoolAuthError) || error.status !== 401) throw error
    }
  }
  throw new IsKoolAuthError(401)
}

export async function logoutFromIsKool(tokens: IsKoolTokens) {
  const { sams, aps } = getIsKoolApiUrls()
  const target = tokens.sams
    ? { url: sams, token: tokens.sams }
    : tokens.aps
      ? { url: aps, token: tokens.aps }
      : null
  if (!target) return
  await requestJson(`${target.url}/auth/logout`, {
    method: "POST",
    headers: { authorization: `Bearer ${target.token}` },
  })
}
