// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  authenticate: vi.fn(),
  loaded: false,
  release: null as (() => void) | null,
}))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  requestHelpers: { get: state.get, post: state.post },
}))

// The WebAuthn library arrives only when a test lets it.
vi.mock('@simplewebauthn/browser', async () => {
  await new Promise<void>((resolve) => (state.release = resolve))
  state.loaded = true
  return { startAuthentication: state.authenticate }
})

const { routeTree } = await import('@/routeTree.gen')
const { Route } = await import('@/routes/index')
const { useAuthStore } = await import('@/stores/auth-store')
const { discardSession, passkeyLogin, prefetchSignIn } =
  await import('@/services/auth-service')

type BeforeLoad = (options: {
  search: Record<string, string>
  context: { queryClient: QueryClient }
}) => Promise<unknown>

const beforeLoad = (search: Record<string, string>, queryClient: QueryClient) =>
  (Route.options.beforeLoad as unknown as BeforeLoad)({
    search,
    context: { queryClient },
  })

const methods = { email: true, passkey: true, recovery: true, signup: true }
const signedIn = {
  user: { email: 'ann@example.com', name: 'Ann', status: 'active' },
  identity: { name: 'Ann', privacy: 'public' },
}

function opened(address: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [address] }),
  })
  return { router, queryClient }
}

const asked = (path: string) =>
  state.get.mock.calls.filter(([url]) => url === path).length

const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

// The answer to /_/identity, held until the test gives it.
let answer: {
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

beforeEach(() => {
  discardSession()
  useAuthStore.getState().clearAuth()
  state.post.mockReset()
  state.get.mockReset().mockImplementation((path: string) => {
    if (path === '/_/auth/methods') return Promise.resolve(methods)
    if (path === '/_/identity') {
      return new Promise((resolve, reject) => (answer = { resolve, reject }))
    }
    return Promise.reject(new Error(`unexpected ${path}`))
  })
})

// THE POINT: the router renders inside I18nProvider, which shows a spinner
// until the language catalogue has loaded, so the sign-in page asked who the
// visitor is, and for its methods, only once the catalogue was in. They are
// asked as the script loads, and the route takes the answers already under way.
describe('the sign-in page asks before its catalogue loads', () => {
  it("asks who the visitor is, for the methods and for the page's code, once", async () => {
    const { router, queryClient } = opened('/')
    const load = vi.spyOn(router, 'loadRouteChunk')
    prefetchSignIn(router, queryClient)
    expect(load).toHaveBeenCalledWith(router.routesById['/'])
    expect(asked('/_/identity')).toBe(1)
    expect(asked('/_/auth/methods')).toBe(1)
    const loading = beforeLoad({}, queryClient)
    answer.reject(new Error('401'))
    await expect(loading).resolves.toBeUndefined()
    expect(asked('/_/identity')).toBe(1)
    expect(asked('/_/auth/methods')).toBe(1)
  })

  it('takes the early answer once, and asks afresh at every check after', async () => {
    const { router, queryClient } = opened('/')
    prefetchSignIn(router, queryClient)
    const first = beforeLoad({}, queryClient)
    answer.reject(new Error('401'))
    await first
    const second = beforeLoad({}, queryClient)
    expect(asked('/_/identity')).toBe(2)
    answer.reject(new Error('401'))
    await expect(second).resolves.toBeUndefined()
  })

  // Another tab may have signed the visitor out, or in as someone else, since.
  it('asks afresh when the early answer is no longer fresh', async () => {
    const replace = vi.fn()
    vi.stubGlobal('location', { ...window.location, replace })
    const now = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now)
    try {
      const { router, queryClient } = opened('/')
      prefetchSignIn(router, queryClient)
      answer.resolve(signedIn)
      await settle()
      clock.mockReturnValue(now + 6_000)
      const loading = beforeLoad({}, queryClient)
      expect(asked('/_/identity')).toBe(2)
      answer.reject(new Error('401'))
      await expect(loading).resolves.toBeUndefined()
      expect(useAuthStore.getState().user).toBeNull()
      expect(replace).not.toHaveBeenCalled()
    } finally {
      clock.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it('asks nothing on another page', () => {
    const { router, queryClient } = opened('/codes')
    prefetchSignIn(router, queryClient)
    expect(state.get).not.toHaveBeenCalled()
  })
})

// A visitor sent back to sign in again has their state cleared; a session
// answer applied before the clear would sign them straight back in.
describe('the early session check and reauth', () => {
  it('is not asked for an address asking for reauth', async () => {
    const { router, queryClient } = opened('/?reauth=1')
    prefetchSignIn(router, queryClient)
    expect(asked('/_/identity')).toBe(0)
    expect(asked('/_/auth/methods')).toBe(1)
    await beforeLoad({ reauth: '1' }, queryClient)
    await settle()
    expect(asked('/_/identity')).toBe(0)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('reaches the store only when the route takes it, never past a reauth', async () => {
    const replace = vi.fn()
    vi.stubGlobal('location', { ...window.location, replace })
    try {
      const { router, queryClient } = opened('/')
      prefetchSignIn(router, queryClient)
      // The server says the visitor is signed in, before any route asks.
      answer.resolve(signedIn)
      await settle()
      expect(useAuthStore.getState().user).toBeNull()

      await beforeLoad({ reauth: '1' }, queryClient)
      await settle()
      expect(useAuthStore.getState().user).toBeNull()

      // The next check asks again rather than taking the dropped answer.
      const loading = beforeLoad({}, queryClient)
      expect(asked('/_/identity')).toBe(2)
      answer.reject(new Error('401'))
      await expect(loading).resolves.toBeUndefined()
      expect(useAuthStore.getState().user).toBeNull()
      expect(replace).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

// THE POINT: a passkey sign-in loaded the WebAuthn library and only then asked
// the server for the challenge; neither needs the other.
describe('passkey sign-in', () => {
  it('asks for the challenge without waiting for the library', async () => {
    state.authenticate.mockResolvedValue({ id: 'credential' })
    state.post.mockImplementation((path: string) => {
      if (path === '/_/auth/passkey/begin') {
        return Promise.resolve({ ceremony: 'c1', options: {} })
      }
      if (path === '/_/auth/passkey/finish') {
        return Promise.resolve({ name: 'Ann' })
      }
      return Promise.reject(new Error(`unexpected ${path}`))
    })
    const signing = passkeyLogin()
    await vi.waitFor(() =>
      expect(state.post).toHaveBeenCalledWith('/_/auth/passkey/begin', {})
    )
    expect(state.loaded).toBe(false)
    await vi.waitFor(() => expect(state.release).not.toBeNull())
    state.release!()
    await expect(signing).resolves.toEqual({})
    expect(state.authenticate).toHaveBeenCalledWith({ optionsJSON: {} })
    expect(state.post).toHaveBeenCalledWith('/_/auth/passkey/finish', {
      ceremony: 'c1',
      id: 'credential',
    })
  })
})
