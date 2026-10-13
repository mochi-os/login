// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// Signing in with an account on another network asks one thing first: a
// Mastodon account's server, or a Bluesky account's handle. The consent is
// then that server's, as for any other provider.
import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button, Input, Label, getErrorMessage, toast } from '@mochi/web'
import { ArrowRight, Loader2 } from 'lucide-react'
import { type OAuthProvider } from '@/api/types/auth'
import { providerAsks, startOauth } from '@/lib/oauth-providers'

export function NetworkSignIn({
  provider,
  redirect,
  email,
  onCancel,
}: {
  provider: OAuthProvider
  redirect?: string
  email?: string
  onCancel: () => void
}) {
  const { t } = useLingui()
  const asks = providerAsks(provider)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  const start = async () => {
    const typed = value.trim()
    if (!typed) return
    setLoading(true)
    try {
      await startOauth(provider, {
        redirect,
        email,
        server: asks === 'server' ? typed : undefined,
        handle: asks === 'handle' ? typed : undefined,
      })
    } catch (error) {
      setLoading(false)
      toast.error(getErrorMessage(error, t`Could not start sign-in`))
    }
  }

  return (
    <form
      className='space-y-3'
      onSubmit={(event) => {
        event.preventDefault()
        void start()
      }}
    >
      <div className='grid gap-2'>
        <Label htmlFor='network-sign-in'>
          {asks === 'server' ? (
            <Trans>Your Mastodon server</Trans>
          ) : (
            <Trans>Your Bluesky handle</Trans>
          )}
        </Label>
        <Input
          id='network-sign-in'
          autoFocus
          autoComplete='off'
          placeholder={asks === 'server' ? 'mastodon.social' : 'alice.bsky.social'}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={loading}
        />
      </div>
      <div className='flex gap-2'>
        <Button
          type='button'
          variant='outline'
          className='flex-1'
          onClick={onCancel}
          disabled={loading}
        >
          <Trans>Back</Trans>
        </Button>
        <Button
          type='submit'
          className='flex-1'
          disabled={loading || !value.trim()}
        >
          {loading ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <ArrowRight className='size-4' />
          )}
          <Trans>Continue</Trans>
        </Button>
      </div>
    </form>
  )
}
