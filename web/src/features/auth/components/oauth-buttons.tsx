// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// OAuth buttons for the email-login verification step. The typed email is
// passed through so the callback binds the sign-in to that account. A network
// provider asks for the account's server or handle first.
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button, toast, getErrorMessage } from '@mochi/web'
import { methodsQuery } from '@/api/auth'
import { type OAuthProvider } from '@/api/types/auth'
import {
  oauthEnabled,
  oauthProviders,
  providerAsks,
  startOauth,
} from '@/lib/oauth-providers'
import { NetworkSignIn } from './network-sign-in'

export function OauthButtons({
  email,
  redirect,
}: {
  email?: string
  redirect?: string
}) {
  const { t } = useLingui()
  // The page's own answer, which the route asked for before the dialog
  // opened; a failure leaves no buttons, as an empty answer would.
  const methods = useQuery(methodsQuery)
  const enabled = useMemo(
    () =>
      methods.data ? oauthEnabled(methods.data) : new Set<OAuthProvider>(),
    [methods.data]
  )
  const [loading, setLoading] = useState<OAuthProvider | null>(null)
  const [asking, setAsking] = useState<OAuthProvider | null>(null)

  const start = async (provider: OAuthProvider) => {
    if (providerAsks(provider)) {
      setAsking(provider)
      return
    }
    setLoading(provider)
    try {
      await startOauth(provider, { redirect, email })
    } catch (error) {
      setLoading(null)
      toast.error(getErrorMessage(error, t`Could not start sign-in`))
    }
  }

  const shown = oauthProviders.filter((provider) => enabled.has(provider.key))
  if (shown.length === 0) return null

  if (asking) {
    return (
      <NetworkSignIn
        provider={asking}
        redirect={redirect}
        email={email}
        onCancel={() => setAsking(null)}
      />
    )
  }

  return (
    <div className='space-y-2'>
      {shown.map(({ key, label, Icon }) => (
        <Button
          key={key}
          type='button'
          variant='outline'
          className='w-full'
          onClick={() => start(key)}
          loading={loading === key}
          disabled={loading !== null}
          icon={<Icon />}
        >
          <Trans>Continue with {label}</Trans>
        </Button>
      ))}
    </div>
  )
}
