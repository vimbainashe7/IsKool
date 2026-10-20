import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const auth = vi.hoisted(() => ({ context: vi.fn(), refresh: vi.fn() }))
vi.mock('@/lib/iskool-auth/server', () => ({
  fetchIsKoolContext: auth.context, refreshIsKoolSession: auth.refresh,
  IsKoolAuthError: class extends Error { constructor(readonly status: number) { super('auth failure') } },
}))
vi.mock('@/lib/iskool-auth/shared', () => ({
  isIsKoolAuthConfigured: () => true,
  iskoolAuthCookies: { samsAccess: 'sams', apsAccess: 'aps', refresh: 'refresh' },
  accessCookieOptions: {}, refreshCookieOptions: {},
}))
vi.mock('@/dev/demo-session', () => ({ canUseDemoSession: () => false, demoSessionCookie: 'demo' }))
vi.mock('@/lib/supabase/proxy', () => ({ refreshSupabaseSession: vi.fn() }))
import { IsKoolAuthError } from '@/lib/iskool-auth/server'
import { proxy } from '@/proxy'
const request = (path = '/api/sams/students') => new NextRequest(`http://localhost${path}`, { headers: { cookie: 'sams=existing; refresh=private-test-placeholder' } })
beforeEach(() => { vi.clearAllMocks() })
it.each([new Error('network timeout'), new IsKoolAuthError(503)])('preserves cookies and does not refresh on a context outage', async (failure) => {
  auth.context.mockRejectedValue(failure)
  const response = await proxy(request())
  expect(response.status).toBe(503)
  expect(response.headers.get('set-cookie')).toBeNull()
  expect(response.headers.get('cache-control')).toContain('no-store')
  expect(auth.refresh).not.toHaveBeenCalled()
})
it('preserves the session when refresh is temporarily unavailable', async () => {
  auth.context.mockRejectedValue(new IsKoolAuthError(401))
  auth.refresh.mockRejectedValue(new Error('network timeout'))
  const response = await proxy(request())
  expect(response.status).toBe(503)
  expect(response.headers.get('set-cookie')).toBeNull()
})
it('still clears a rejected refresh credential', async () => {
  auth.context.mockRejectedValue(new IsKoolAuthError(401))
  auth.refresh.mockRejectedValue(new IsKoolAuthError(401))
  const response = await proxy(request())
  expect(response.headers.get('set-cookie')).toContain('refresh=;')
})
it('returns a clear retryable page error without exposing credentials', async () => {
  auth.context.mockRejectedValue(new Error('network timeout'))
  const response = await proxy(request('/admin/students'))
  expect(response.status).toBe(503)
  expect(await response.text()).toContain('Reload')
  expect(response.headers.get('set-cookie')).toBeNull()
})
