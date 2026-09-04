// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// OAuth buttons for the email-login verification step. The typed email is
// passed through so the callback binds the sign-in to that account.

import { useState, useEffect } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Loader2 } from 'lucide-react'
import { Button, toast, getErrorMessage } from '@mochi/web'
import { authApi } from '@/api/auth'
import { type OAuthProvider } from '@/api/types/auth'
import { oauthEnabled, oauthProviders, startOauth } from '@/lib/oauth-providers'

export function OauthButtons({
  email,
  redirect,
}: {
  email?: string
  redirect?: string
}) {
  const { t } = useLingui()
  const [enabled, setEnabled] = useState<Set<OAuthProvider>>(new Set())
  const [loading, setLoading] = useState<OAuthProvider | null>(null)

  useEffect(() => {
    authApi.getMethods().then((methods) => {
      setEnabled(oauthEnabled(methods))
    }).catch(() => {
      // See landing-page.tsx: an unhandled rejection here silently removes
      // every OAuth button.
      setEnabled(new Set())
    })
  }, [])

  const start = async (provider: OAuthProvider) => {
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

  return (
    <div className='space-y-2'>
      {shown.map(({ key, label, Icon }) => (
        <Button
          key={key}
          type='button'
          variant='outline'
          className='w-full'
          onClick={() => start(key)}
          disabled={loading !== null}
        >
          {loading === key ? <Loader2 className='animate-spin' /> : <Icon />}
          <Trans>Continue with {label}</Trans>
        </Button>
      ))}
    </div>
  )
}
