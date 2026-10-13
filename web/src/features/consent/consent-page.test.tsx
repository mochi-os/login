// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConsentData } from '@/api/consent'
import { ConsentPage } from './consent-page'

const state = vi.hoisted(() => ({
  request: vi.fn(),
  approve: vi.fn(),
  refuse: vi.fn(),
  left: '' as string,
}))

vi.mock('@/api/consent', () => ({
  consentApi: {
    request: state.request,
    approve: state.approve,
    refuse: state.refuse,
  },
}))
vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({ request: 'r1' }),
}))
vi.mock('@/features/auth/auth-layout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))
vi.mock('@mochi/web', async (original) => ({
  ...(await original<typeof import('@mochi/web')>()),
  toast: { success: vi.fn(), error: vi.fn() },
}))

const data = (
  writes: boolean,
  home = '',
  feeds: { id: string; name: string }[] = [{ id: 'fd1', name: 'Notes' }]
): ConsentData => ({
  request: {
    id: 'r1',
    client: { id: 'c1', name: 'Ivory', website: 'https://ivory.example' },
    network: 'fediverse',
    scope: writes ? 'read write' : 'read',
    scopes: writes ? ['read', 'write'] : ['read'],
    writes,
    hint: '',
    accounts: [
      {
        id: 'a1',
        identifier: 'alice@example.com',
        name: 'Alice',
        home,
        hinted: true,
      },
    ],
  },
  feeds,
})

function show(answer: ConsentData) {
  state.request.mockResolvedValue(answer)
  render(
    <I18nProvider i18n={i18n}>
      <ConsentPage />
    </I18nProvider>
  )
}

describe('Consent page', () => {
  beforeEach(() => {
    i18n.load('en', {})
    i18n.activate('en')
    state.request.mockReset()
    state.approve.mockReset()
    state.refuse.mockReset()
    state.left = ''
    // The answer sends the browser to the client, which jsdom cannot do:
    // the assignment is caught instead.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        get href() {
          return state.left
        },
        set href(value: string) {
          state.left = value
        },
      },
    })
  })

  it('names the app, the account and what it may do', async () => {
    show(data(false))
    expect(await screen.findByText('Ivory')).toBeTruthy()
    expect(screen.getByText('https://ivory.example')).toBeTruthy()
    expect(screen.getByText('alice@example.com')).toBeTruthy()
    expect(screen.getByText('It may read your account.')).toBeTruthy()
    // A read-only sign-in asks nothing about a home feed.
    expect(
      screen.queryByText('Where should posts made from this app go?')
    ).toBeNull()
  })

  it('asks for a home feed when the app writes and the account has none', async () => {
    state.approve.mockResolvedValue({ url: 'https://ivory.example/cb?code=1' })
    show(data(true))
    await screen.findByText('Ivory')
    expect(
      screen.getByText('It may read your account and post as it.')
    ).toBeTruthy()
    expect(
      screen.getByText('Where should posts made from this app go?')
    ).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByLabelText('A new feed named Alice'))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    })
    await waitFor(() => expect(state.approve).toHaveBeenCalled())
    expect(state.approve).toHaveBeenCalledWith({
      request: 'r1',
      account: 'a1',
      feed: undefined,
      create: true,
    })
    expect(state.left).toBe('https://ivory.example/cb?code=1')
  })

  it('offers the existing public feeds and passes the chosen one', async () => {
    state.approve.mockResolvedValue({ url: 'https://ivory.example/cb?code=2' })
    show(data(true))
    await screen.findByText('Ivory')
    // The existing feed is the default when there is one.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    })
    await waitFor(() => expect(state.approve).toHaveBeenCalled())
    expect(state.approve).toHaveBeenCalledWith({
      request: 'r1',
      account: 'a1',
      feed: 'fd1',
      create: false,
    })
  })

  it('asks nothing about feeds when the account has a home feed', async () => {
    state.approve.mockResolvedValue({ url: 'https://ivory.example/cb?code=3' })
    show(data(true, 'fd1'))
    await screen.findByText('Ivory')
    expect(
      screen.queryByText('Where should posts made from this app go?')
    ).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    })
    await waitFor(() => expect(state.approve).toHaveBeenCalled())
    expect(state.approve.mock.calls[0][0]).toMatchObject({
      feed: undefined,
      create: false,
    })
  })

  it('refuses and goes back to the app', async () => {
    state.refuse.mockResolvedValue({
      url: 'https://ivory.example/cb?error=access_denied',
    })
    show(data(false))
    await screen.findByText('Ivory')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Refuse' }))
    })
    await waitFor(() => expect(state.refuse).toHaveBeenCalledWith('r1'))
    expect(state.left).toBe('https://ivory.example/cb?error=access_denied')
  })

  it('says when the request is gone', async () => {
    state.request.mockRejectedValue(new Error('404'))
    render(
      <I18nProvider i18n={i18n}>
        <ConsentPage />
      </I18nProvider>
    )
    expect(
      await screen.findByText(
        'This sign-in request has expired or was already answered.'
      )
    ).toBeTruthy()
  })
})
