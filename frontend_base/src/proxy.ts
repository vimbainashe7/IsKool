import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { canUseDemoSession, demoSessionCookie } from '@/dev/demo-session'
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

  const { response, user } = await refreshSupabaseSession(request)
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

  if (!user && !hasDemoSession && !isPublicRoute) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('next', pathname)
    return redirectWithSession(signInUrl)
  }

  if ((user || hasDemoSession) && (pathname === '/sign-in' || pathname === '/sign-up')) {
    return redirectWithSession(new URL('/home', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
