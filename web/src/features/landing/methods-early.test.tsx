// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// Not colocated under src/routes: the route generator turns any file there
// into a route.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  get: vi.fn(),
  session: vi.fn(),
}))

vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  requestHelpers: { get: state.get, post: vi.fn() },
}))
vi.mock('@/services/auth-service', async (original) => ({
  ...(await original<typeof import('@/services/auth-service')>()),
  resolveSession: state.session,
}))

const { Route } = await import('@/routes/index')
const { methodsQuery } = await import('@/api/auth')
const { OauthButtons } =
  await import('@/features/auth/components/oauth-buttons')

const methods = {
  email: true,
  passkey: true,
  recovery: true,
  signup: true,
  oauth: { google: true },
}

type BeforeLoad = (options: {
  search: Record<string, string>
  context: { queryClient: QueryClient }
}) => Promise<unknown>

function client() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
}

describe('sign-in page', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    state.get.mockReset().mockResolvedValue(methods)
    // Who the visitor is never answers here, so whatever is asked is asked
    // without waiting for it.
    state.session.mockReset().mockReturnValue(new Promise(() => {}))
  })

  it('asks for the sign-in methods and its own code before knowing who the visitor is', async () => {
    const preload = vi.fn(async () => {})
    const component = Route.options.component
    Route.options.component = Object.assign(() => null, { preload })
    try {
      void (Route.options.beforeLoad as unknown as BeforeLoad)({
        search: {},
        context: { queryClient: client() },
      })
      await waitFor(() => expect(state.get).toHaveBeenCalledTimes(1))
      expect(state.session).toHaveBeenCalled()
      expect(preload).toHaveBeenCalled()
    } finally {
      Route.options.component = component
    }
  })

  it("gives the sign-in dialog the page's answer rather than asking again", async () => {
    const queryClient = client()
    await queryClient.prefetchQuery(methodsQuery)
    render(
      <I18nProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <OauthButtons />
        </QueryClientProvider>
      </I18nProvider>
    )
    await screen.findByText(/Google/)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(state.get).toHaveBeenCalledTimes(1)
  })
})
