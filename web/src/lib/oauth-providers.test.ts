// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@lingui/core'
import type { AuthMethodsResponse } from '@/api/types/auth'

const oauthBegin = vi.fn()

// startOauth's refusal is a translated message; main.tsx activates the
// locale in the app, so do the same here with an empty catalog (the source
// text is what comes back).
beforeAll(() => {
  i18n.load('en', {})
  i18n.activate('en')
})

// The real provider names, without the rest of the @mochi/web barrel.
vi.mock('@mochi/web', async () => {
  const names = await vi.importActual<
    typeof import('../../../../../lib/web/src/lib/provider-name')
  >('../../../../../lib/web/src/lib/provider-name')
  return { ...names, getRouterBasepath: () => '/' }
})
vi.mock('@/api/auth', () => ({
  authApi: { oauthBegin: (...args: unknown[]) => oauthBegin(...args) },
}))
vi.mock('@/features/auth/components/brand-icons', () => ({
  FacebookIcon: () => null,
  GoogleIcon: () => null,
  MicrosoftIcon: () => null,
  XIcon: () => null,
}))

import {
  oauthEnabled,
  oauthProviderKeys,
  oauthProviders,
  startOauth,
} from './oauth-providers'

const methods = (oauth?: AuthMethodsResponse['oauth']): AuthMethodsResponse => ({
  email: true,
  passkey: false,
  recovery: true,
  signup: true,
  ...(oauth ? { oauth } : {}),
})

describe('oauthProviders', () => {
  it('lists the five providers alphabetically with their brand names', () => {
    expect(oauthProviders.map((p) => p.key)).toEqual([...oauthProviderKeys])
    expect(oauthProviders.map((p) => p.label)).toEqual([
      'Facebook',
      'GitHub',
      'Google',
      'Microsoft',
      'X',
    ])
  })

  it('keeps only the providers the operator turned on', () => {
    const on = { facebook: false, github: true, google: true, microsoft: false, x: false }
    expect([...oauthEnabled(methods(on))]).toEqual(['github', 'google'])
    expect(oauthEnabled(methods()).size).toBe(0)
  })
})

describe('startOauth', () => {
  beforeEach(() => {
    oauthBegin.mockReset()
    // jsdom reports the navigation it cannot perform on console.error.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('refuses a URL that would execute rather than navigate', async () => {
    oauthBegin.mockResolvedValue({ url: 'javascript:fetch("/_/token")' })
    await expect(startOauth('github')).rejects.toThrow('Could not start sign-in')
    oauthBegin.mockResolvedValue({ url: '' })
    await expect(startOauth('github')).rejects.toThrow('Could not start sign-in')
  })

  it('sends the validated target and the typed email, then navigates', async () => {
    oauthBegin.mockResolvedValue({ url: 'https://github.com/login/oauth/authorize?x=1' })
    await expect(
      startOauth('github', { redirect: 'https://evil.example/steal', email: 'a@example.com' }),
    ).resolves.toBeUndefined()
    expect(oauthBegin).toHaveBeenLastCalledWith('github', { target: '/', email: 'a@example.com' })

    await startOauth('google', { redirect: '/feeds/' })
    expect(oauthBegin).toHaveBeenLastCalledWith('google', { target: '/feeds/', email: undefined })
  })
})
