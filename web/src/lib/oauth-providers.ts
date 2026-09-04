// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// The one place this app lists the OAuth providers it can offer. The label is
// the brand name, verbatim in every locale; the icon is the brand mark. Both
// components that render the buttons and the callback-error mapping read from
// here, so adding a provider is one entry.

import type { ComponentType, SVGProps } from 'react'
import { Github } from 'lucide-react'
import { msg } from '@lingui/core/macro'
import { i18n } from '@lingui/core'
import { providerName } from '@mochi/web'
import { authApi } from '@/api/auth'
import { type AuthMethodsResponse, type OAuthProvider } from '@/api/types/auth'
import {
  FacebookIcon,
  GoogleIcon,
  MicrosoftIcon,
  XIcon,
} from '@/features/auth/components/brand-icons'
import { navigable, safeRedirect } from '@/lib/redirect'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

// Alphabetical by key, which is the order the buttons render in.
export const oauthProviderKeys: readonly OAuthProvider[] = [
  'facebook',
  'github',
  'google',
  'microsoft',
  'x',
]

const icons: Record<OAuthProvider, Icon> = {
  facebook: FacebookIcon,
  github: Github,
  google: GoogleIcon,
  microsoft: MicrosoftIcon,
  x: XIcon,
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
  options: { redirect?: string; email?: string } = {},
): Promise<void> {
  const target = options.redirect ? safeRedirect(options.redirect) : '/'
  const { url } = await authApi.oauthBegin(provider, {
    target,
    email: options.email,
  })
  if (!navigable(url)) {
    throw new Error(i18n._(msg`Could not start sign-in`))
  }
  window.location.href = url
}
