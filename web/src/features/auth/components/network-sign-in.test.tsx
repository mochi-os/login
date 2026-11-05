// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { OAuthProvider } from '@/api/types/auth'
import { NetworkSignIn } from './network-sign-in'

const oauthBegin = vi.fn()

vi.mock('@/api/auth', () => ({
  authApi: { oauthBegin: (...args: unknown[]) => oauthBegin(...args) },
}))

beforeAll(() => {
  i18n.load('en', {})
  i18n.activate('en')
})

beforeEach(() => {
  oauthBegin.mockReset()
  oauthBegin.mockResolvedValue({
    url: 'https://mastodon.social/oauth/authorize',
  })
  localStorage.clear()
  // jsdom reports the navigation it cannot perform on console.error.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderField(provider: OAuthProvider) {
  return render(
    <I18nProvider i18n={i18n}>
      <NetworkSignIn provider={provider} onCancel={vi.fn()} />
    </I18nProvider>
  )
}

function field(): HTMLInputElement {
  return screen.getByRole('textbox') as HTMLInputElement
}

async function signIn(value: string) {
  fireEvent.change(field(), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  await waitFor(() => expect(oauthBegin).toHaveBeenCalled())
}

// What a sign-in began with is offered again the next time, so a returning
// user need not type their server or handle each time.
describe('NetworkSignIn', () => {
  it('offers the Mastodon server the last sign-in began with', async () => {
    const first = renderField('mastodon')
    expect(field().value).toBe('')
    await signIn(' mastodon.social ')
    expect(oauthBegin).toHaveBeenLastCalledWith(
      'mastodon',
      expect.objectContaining({ server: 'mastodon.social' })
    )
    first.unmount()

    renderField('mastodon')
    expect(field().value).toBe('mastodon.social')
  })

  it('keeps the Bluesky handle apart from the Mastodon server', async () => {
    const mastodon = renderField('mastodon')
    await signIn('mastodon.social')
    mastodon.unmount()

    const bluesky = renderField('bluesky')
    expect(field().value).toBe('')
    await signIn('alice.bsky.social')
    expect(oauthBegin).toHaveBeenLastCalledWith(
      'bluesky',
      expect.objectContaining({ handle: 'alice.bsky.social' })
    )
    bluesky.unmount()

    const again = renderField('bluesky')
    expect(field().value).toBe('alice.bsky.social')
    again.unmount()
    renderField('mastodon')
    expect(field().value).toBe('mastodon.social')
  })

  it('does not remember a server the sign-in refused', async () => {
    localStorage.setItem('mochi:login:mastodon', 'mastodon.social')
    oauthBegin.mockRejectedValue(new Error('invalid server'))
    renderField('mastodon')
    await signIn('not a server')
    expect(localStorage.getItem('mochi:login:mastodon')).toBe('mastodon.social')
  })

  it('still signs in where the browser refuses storage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('refused')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('refused')
    })
    renderField('mastodon')
    expect(field().value).toBe('')
    await signIn('mastodon.social')
    expect(oauthBegin).toHaveBeenLastCalledWith(
      'mastodon',
      expect.objectContaining({ server: 'mastodon.social' })
    )
  })
})
