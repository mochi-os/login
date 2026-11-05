// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// The one place this app lists the OAuth providers it can offer. The label is
// the brand name, verbatim in every locale; the icon is the brand mark. Both
// components that render the buttons and the callback-error mapping read from
// here, so adding a provider is one entry.
import type { ComponentType, SVGProps } from 'react'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { providerName } from '@mochi/web'
import { Github } from 'lucide-react'
import { authApi } from '@/api/auth'
import { type AuthMethodsResponse, type OAuthProvider } from '@/api/types/auth'
import { navigable, safeRedirect } from '@/lib/redirect'
import {
  BlueskyIcon,
  FacebookIcon,
  GoogleIcon,
  MastodonIcon,
  MicrosoftIcon,
  XIcon,
} from '@/features/auth/components/brand-icons'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

// Alphabetical by key, which is the order the buttons render in.
export const oauthProviderKeys: readonly OAuthProvider[] = [
  'bluesky',
  'facebook',
  'github',
  'google',
  'mastodon',
  'microsoft',
  'x',
]

const icons: Record<OAuthProvider, Icon> = {
  bluesky: BlueskyIcon,
  facebook: FacebookIcon,
  github: Github,
  google: GoogleIcon,
  mastodon: MastodonIcon,
  microsoft: MicrosoftIcon,
  x: XIcon,
}

// What a network provider asks before it can begin: Mastodon the account's
// server, Bluesky its handle. The other providers ask nothing.
export function providerAsks(
  provider: OAuthProvider
): 'server' | 'handle' | null {
  switch (provider) {
    case 'mastodon':
      return 'server'
    case 'bluesky':
      return 'handle'
  }
  return null
}

// The server or handle a network provider was last begun with in this browser,
// kept so the next sign-in need not ask for it again. Kept in the browser
// alone, as nothing on the server needs it; where storage is refused it is
// simply not remembered.
function rememberedKey(provider: OAuthProvider): string {
  return `mochi:login:${provider}`
}

export function remembered(provider: OAuthProvider): string {
  try {
    return localStorage.getItem(rememberedKey(provider)) ?? ''
  } catch {
    return ''
  }
}

export function remember(provider: OAuthProvider, value: string): void {
  try {
    localStorage.setItem(rememberedKey(provider), value)
  } catch {
    /* no storage: the next sign-in asks again */
  }
}

export const oauthProviders: ReadonlyArray<{
  key: OAuthProvider
  label: string
  Icon: Icon
}> = oauthProviderKeys.map((key) => ({
  key,
  label: providerName(key),
  Icon: icons[key],
}))

// The providers the operator has enabled, read from /_/auth/methods.
export function oauthEnabled(methods: AuthMethodsResponse): Set<OAuthProvider> {
  const enabled = new Set<OAuthProvider>()
  if (methods.oauth) {
    for (const key of oauthProviderKeys) {
      if (methods.oauth[key]) enabled.add(key)
    }
  }
  return enabled
}

// Begin an OAuth sign-in and hand the browser to the provider. `redirect` is
// where to land afterwards, validated as a same-origin path; `email` binds the
// sign-in to the account typed on the verification step so the callback
// refuses a different one. The URL the server answers is built from
// operator-configured provider settings, so it is checked before assignment:
// login runs in the top window with the session cookie, where a `javascript:`
// URL would execute rather than navigate.
export async function startOauth(
  provider: OAuthProvider,
  options: {
    redirect?: string
    email?: string
    server?: string
    handle?: string
  } = {}
): Promise<void> {
  const target = options.redirect ? safeRedirect(options.redirect) : '/'
  const { url } = await authApi.oauthBegin(provider, {
    target,
    email: options.email,
    server: options.server,
    handle: options.handle,
  })
  if (!navigable(url)) {
    throw new Error(i18n._(msg`Could not start sign-in`))
  }
  window.location.href = url
}
