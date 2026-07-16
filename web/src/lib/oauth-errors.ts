// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// Maps an oauth_error query code from the server-side callback to a toast
// message. Defined in one place so the login page, auth settings page, and any
// future caller all render the same strings.

import { msg } from '@lingui/core/macro'
import { i18n } from '@lingui/core'

// Brand names — never translated.
/* eslint-disable lingui/no-unlocalized-strings */
const providerLabel = (provider?: string): string => {
  if (!provider) return i18n._(msg`the provider`)
  switch (provider) {
    case 'github':
      return 'GitHub'
    case 'google':
      return 'Google'
    case 'microsoft':
      return 'Microsoft'
    case 'facebook':
      return 'Facebook'
    case 'x':
      return 'X'
    default:
      return provider
  }
}
/* eslint-enable lingui/no-unlocalized-strings */

export function oauthErrorMessage(code: string, provider?: string): string {
  switch (code) {
    case 'access_denied':
      return i18n._(msg`Sign-in cancelled`)
    case 'signup_disabled':
      return i18n._(msg`New accounts are disabled on this server`)
    case 'email_exists':
      return i18n._(msg`An account with that email already exists. Sign in first, then link ${providerLabel(provider)} from your auth settings.`)
    case 'email_unverified':
      return i18n._(msg`Your ${providerLabel(provider)} email is not verified`)
    case 'oauth_disallowed':
      return i18n._(msg`Your account requires a passkey to sign in`)
    case 'already_linked':
      return i18n._(msg`That ${providerLabel(provider)} account is already linked to another user`)
    case 'state_invalid':
      return i18n._(msg`Login session expired, please try again`)
    case 'suspended':
      return i18n._(msg`Your account has been suspended`)
    case 'unknown_provider':
      return i18n._(msg`That sign-in provider is not available`)
    case 'provider_error':
    default:
      return i18n._(msg`Sign-in failed, please try again`)
  }
}
