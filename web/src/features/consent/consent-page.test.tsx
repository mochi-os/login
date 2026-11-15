// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { ApiError } from '@mochi/web'
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
    feed: writes,
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

  it('names the app, what it may do, its site and the account', async () => {
    show(data(false))
    expect(await screen.findByText('Allow Ivory to read?')).toBeTruthy()
    // The site's host alone, which tells the real app from one borrowing its
    // name.
    expect(screen.getByText('ivory.example')).toBeTruthy()
    expect(screen.queryByText('https://ivory.example')).toBeNull()
    expect(screen.getByText('alice@example.com')).toBeTruthy()
    // A read-only sign-in asks nothing about a home feed.
    expect(screen.queryByText('Home feed')).toBeNull()
  })

  it('asks for a home feed when the app writes and the account has none', async () => {
    state.approve.mockResolvedValue({ url: 'https://ivory.example/cb?code=1' })
    show(data(true))
    expect(
      await screen.findByText('Allow Ivory to read and post?')
    ).toBeTruthy()
    const select = screen.getByLabelText('Home feed')
    expect(select.textContent).toBe('Notes')
    fireEvent.click(select)
    expect(
      screen.getAllByRole('option').map((option) => option.textContent)
    ).toEqual(['Notes', 'A new feed'])
    fireEvent.click(screen.getByRole('option', { name: 'A new feed' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Allow' }))
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

  it('offers only a new feed when the user has no public feed', async () => {
    state.approve.mockResolvedValue({ url: 'https://ivory.example/cb?code=4' })
    show(data(true, '', []))
    await screen.findByText('Allow Ivory to read and post?')
    expect(screen.getByLabelText('Home feed').textContent).toBe('A new feed')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Allow' }))
    })
    await waitFor(() => expect(state.approve).toHaveBeenCalled())
    expect(state.approve.mock.calls[0][0]).toMatchObject({
      feed: undefined,
      create: true,
    })
  })

  // A Matrix client writes to rooms, not a feed: Element was asked where its
  // posts should go, and could not be approved without naming a feed.
  it('asks nothing about feeds when the app writes to rooms', async () => {
    state.approve.mockResolvedValue({
      url: 'https://element.example/cb?code=1',
    })
    const matrix = data(true)
    show({
      ...matrix,
      request: { ...matrix.request, network: 'matrix', feed: false },
    })
    expect(
      await screen.findByText('Allow Ivory to read and post?')
    ).toBeTruthy()
    expect(screen.queryByText('Home feed')).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Allow' }))
    })
    await waitFor(() => expect(state.approve).toHaveBeenCalled())
    expect(state.approve).toHaveBeenCalledWith({
      request: 'r1',
      account: 'a1',
      feed: undefined,
      create: false,
    })
  })

  it('offers the existing public feeds and passes the chosen one', async () => {
    state.approve.mockResolvedValue({ url: 'https://ivory.example/cb?code=2' })
    show(data(true))
    await screen.findByText('Allow Ivory to read and post?')
    // The existing feed is the default when there is one.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Allow' }))
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
    await screen.findByText('Allow Ivory to read and post?')
    expect(screen.queryByText('Home feed')).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Allow' }))
    })
    await waitFor(() => expect(state.approve).toHaveBeenCalled())
    expect(state.approve.mock.calls[0][0]).toMatchObject({
      feed: undefined,
      create: false,
    })
  })

  it('offers the accounts to choose from when there are several', async () => {
    state.approve.mockResolvedValue({ url: 'https://ivory.example/cb?code=5' })
    const several = data(false)
    show({
      ...several,
      request: {
        ...several.request,
        accounts: [
          { ...several.request.accounts[0], hinted: false },
          {
            id: 'a2',
            identifier: 'work@example.com',
            name: 'Work',
            home: '',
            hinted: true,
          },
        ],
      },
    })
    await screen.findByText('Allow Ivory to read?')
    // The account the app named is the one chosen.
    const select = screen.getByLabelText('Account')
    expect(select.textContent).toBe('work@example.com')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Allow' }))
    })
    await waitFor(() => expect(state.approve).toHaveBeenCalled())
    expect(state.approve.mock.calls[0][0]).toMatchObject({ account: 'a2' })
  })

  it('says when the user has no account on the network', async () => {
    const none = data(false)
    show({ ...none, request: { ...none.request, accounts: [] } })
    expect(
      await screen.findByText('You have no ActivityPub account here.')
    ).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Allow' }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
  })

  it('denies and goes back to the app', async () => {
    state.refuse.mockResolvedValue({
      url: 'https://ivory.example/cb?error=access_denied',
    })
    show(data(false))
    await screen.findByText('Allow Ivory to read?')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Deny' }))
    })
    await waitFor(() => expect(state.refuse).toHaveBeenCalledWith('r1'))
    expect(state.left).toBe('https://ivory.example/cb?error=access_denied')
  })

  it('says when the request is gone', async () => {
    state.request.mockRejectedValue(
      new ApiError({ message: 'Request not found', status: 404 })
    )
    render(
      <I18nProvider i18n={i18n}>
        <ConsentPage />
      </I18nProvider>
    )
    expect(
      await screen.findByText('This request is no longer valid.')
    ).toBeTruthy()
  })

  // Every failure read as an expired request, which hid the page asking
  // without its app token.
  it('says what failed when the request is refused for another reason', async () => {
    state.request.mockRejectedValue(
      new ApiError({ message: 'App token required', status: 403 })
    )
    render(
      <I18nProvider i18n={i18n}>
        <ConsentPage />
      </I18nProvider>
    )
    expect(await screen.findByText('App token required')).toBeTruthy()
    expect(screen.queryByText('This request is no longer valid.')).toBeNull()
  })
})
