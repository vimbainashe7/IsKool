import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { canUseDemoSession, demoSessionCookie } from '@/dev/demo-session'
import {
  fetchIsKoolContext,
  refreshIsKoolSession,
} from '@/lib/iskool-auth/server'
import {
  accessCookieOptions,
  isIsKoolAuthConfigured,
  iskoolAuthCookies,
  refreshCookieOptions,
} from '@/lib/iskool-auth/shared'
import { refreshSupabaseSession } from '@/lib/supabase/proxy'

const publicRoutes = new Set([
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/update-password',
  '/auth/confirm',
  '/auth/callback',
  '/reset-password',
])

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  if (pathname === '/register') {
    return NextResponse.redirect(new URL('/sign-up', request.url))
  }

  if (pathname.startsWith('/auth/') && !['/auth/confirm', '/auth/callback'].includes(pathname)) {
    return NextResponse.redirect(
      new URL(pathname.replace('/auth', ''), request.url)
    )
  }

  let response: NextResponse
  let authenticated = false
  if (isIsKoolAuthConfigured()) {
    response = NextResponse.next({ request })
    const currentTokens = {
      sams: request.cookies.get(iskoolAuthCookies.samsAccess)?.value,
      aps: request.cookies.get(iskoolAuthCookies.apsAccess)?.value,
    }
    try {
      await fetchIsKoolContext(currentTokens)
      authenticated = true
    } catch {
      const refreshToken = request.cookies.get(iskoolAuthCookies.refresh)?.value
      if (refreshToken) {
        try {
          const refreshed = await refreshIsKoolSession(refreshToken)
          const cookieUpdates = [
            {
              name: iskoolAuthCookies.samsAccess,
              value: refreshed.accessTokens.sams,
              options: accessCookieOptions,
            },
            {
              name: iskoolAuthCookies.apsAccess,
              value: refreshed.accessTokens.aps,
              options: accessCookieOptions,
            },
            {
              name: iskoolAuthCookies.refresh,
              value: refreshed.refreshToken,
              options: refreshCookieOptions,
            },
          ] as const
          cookieUpdates.forEach(({ name, value }) => {
            if (value) request.cookies.set(name, value)
            else request.cookies.delete(name)
          })
          response = NextResponse.next({ request })
          cookieUpdates.forEach(({ name, value, options }) => {
            if (value) response.cookies.set(name, value, options)
            else response.cookies.delete(name)
          })
          authenticated = true
        } catch {
          Object.values(iskoolAuthCookies).forEach((name) => {
            request.cookies.delete(name)
            response.cookies.delete(name)
          })
        }
      } else {
        Object.values(iskoolAuthCookies).forEach((name) =>
          response.cookies.delete(name)
        )
      }
    }
  } else {
    const supabaseSession = await refreshSupabaseSession(request)
    response = supabaseSession.response
    authenticated = Boolean(supabaseSession.user)
  }
  response.headers.set('Cache-Control', 'private, no-store')
  function redirectWithSession(url: URL) {
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie))
    redirect.headers.set('Cache-Control', 'private, no-store')
    return redirect
  }
  if (pathname.startsWith("/api/")) return response
  const isPublicRoute = publicRoutes.has(pathname) || pathname.startsWith('/errors/')
  const hasDemoSession = canUseDemoSession() && Boolean(request.cookies.get(demoSessionCookie)?.value)

  if (!authenticated && !hasDemoSession && !isPublicRoute) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('next', pathname)
    return redirectWithSession(signInUrl)
  }

  if ((authenticated || hasDemoSession) && (pathname === '/sign-in' || pathname === '/sign-up')) {
    return redirectWithSession(new URL('/home', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
