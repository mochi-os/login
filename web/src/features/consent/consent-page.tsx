// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// Another app signing in to one of the user's hosted accounts: which app is
// asking, for which account and with what access, with approve and refuse.
// When the app asks to write and the account has no home feed, the page asks
// where posts made from the app should go (decision 42).
import { useEffect, useMemo, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  getErrorMessage,
  providerName,
  toast,
} from '@mochi/web'
import { Check, Loader2, X } from 'lucide-react'
import { AuthLayout } from '@/features/auth/auth-layout'
import { consentApi, type ConsentData } from '@/api/consent'
import { navigable } from '@/lib/redirect'

// The networks' names. The fediverse is a common noun the languages make their
// own; XMPP is an initialism the provider naming would miscase; the rest are
// brands the library capitalises.
function networkLabel(network: string): string {
  switch (network) {
    case 'fediverse':
      return i18n._(msg`Fediverse`)
    case 'xmpp':
      return i18n._(msg`XMPP`)
  }
  return providerName(network)
}

// Where the browser goes once the request is answered: the client's redirect,
// which is not this origin and so is checked as a navigable URL first.
function leave(url: string) {
  if (navigable(url)) {
    window.location.href = url
  }
}

export function ConsentPage() {
  const { t } = useLingui()
  const { request } = useSearch({ from: '/oauth/consent' })
  const [data, setData] = useState<ConsentData | null>(null)
  const [failed, setFailed] = useState(false)
  const [account, setAccount] = useState('')
  const [home, setHome] = useState<'existing' | 'new'>('existing')
  const [feed, setFeed] = useState('')
  const [pending, setPending] = useState<'approve' | 'refuse' | null>(null)

  useEffect(() => {
    if (!request) {
      setFailed(true)
      return
    }
    let cancelled = false
    consentApi
      .request(request)
      .then((answer) => {
        if (cancelled) return
        setData(answer)
        const hinted = answer.request.accounts.find((a) => a.hinted)
        setAccount((hinted ?? answer.request.accounts[0])?.id ?? '')
        setFeed(answer.feeds[0]?.id ?? '')
        if (answer.feeds.length === 0) setHome('new')
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [request])

  const chosen = useMemo(
    () => data?.request.accounts.find((a) => a.id === account),
    [data, account]
  )
  // The home feed question arises once: a write scope, an account with no
  // home feed yet.
  const asksHome = !!data?.request.writes && !!chosen && !chosen.home

  const approve = async () => {
    if (!data || !chosen) return
    setPending('approve')
    try {
      const answer = await consentApi.approve({
        request: data.request.id,
        account: chosen.id,
        feed: asksHome && home === 'existing' ? feed : undefined,
        create: asksHome && home === 'new',
      })
      leave(answer.url)
    } catch (error) {
      setPending(null)
      toast.error(getErrorMessage(error, t`Could not approve the sign-in`))
    }
  }

  const refuse = async () => {
    if (!data) return
    setPending('refuse')
    try {
      const answer = await consentApi.refuse(data.request.id)
      leave(answer.url)
    } catch (error) {
      setPending(null)
      toast.error(getErrorMessage(error, t`Could not refuse the sign-in`))
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Sign in to your account</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {failed ? (
            <p className='text-muted-foreground text-sm'>
              <Trans>
                This sign-in request has expired or was already answered.
              </Trans>
            </p>
          ) : !data ? (
            <div className='flex justify-center py-6'>
              <Loader2 className='size-5 animate-spin' />
            </div>
          ) : (
            <>
              <p className='text-sm'>
                <Trans>
                  <span className='font-medium'>{data.request.client.name}</span>{' '}
                  asks to sign in to your {networkLabel(data.request.network)}{' '}
                  account.
                </Trans>
              </p>
              {data.request.client.website && (
                <p className='text-muted-foreground truncate text-sm'>
                  {data.request.client.website}
                </p>
              )}
              <div className='rounded-lg border px-4 py-3 text-sm'>
                {data.request.writes ? (
                  <Trans>It may read your account and post as it.</Trans>
                ) : (
                  <Trans>It may read your account.</Trans>
                )}
              </div>

              {data.request.accounts.length === 0 ? (
                <p className='text-muted-foreground text-sm'>
                  <Trans>
                    You have no account on this network. Reserve a handle in
                    Settings first.
                  </Trans>
                </p>
              ) : data.request.accounts.length === 1 ? (
                <p className='text-sm font-medium'>
                  {data.request.accounts[0].identifier}
                </p>
              ) : (
                <div className='grid gap-2'>
                  <Label htmlFor='consent-account'>
                    <Trans>Account</Trans>
                  </Label>
                  <Select value={account} onValueChange={setAccount}>
                    <SelectTrigger id='consent-account'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {data.request.accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.identifier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {asksHome && (
                <div className='grid gap-3'>
                  <p className='text-sm'>
                    <Trans>Where should posts made from this app go?</Trans>
                  </p>
                  <RadioGroup
                    value={home}
                    onValueChange={(value) => setHome(value as 'existing' | 'new')}
                  >
                    {data.feeds.length > 0 && (
                      <div className='flex items-center gap-2'>
                        <RadioGroupItem value='existing' id='home-existing' />
                        <Label htmlFor='home-existing'>
                          <Trans>An existing public feed</Trans>
                        </Label>
                      </div>
                    )}
                    <div className='flex items-center gap-2'>
                      <RadioGroupItem value='new' id='home-new' />
                      <Label htmlFor='home-new'>
                        <Trans>
                          A new feed named {chosen.name || chosen.identifier}
                        </Trans>
                      </Label>
                    </div>
                  </RadioGroup>
                  {home === 'existing' && data.feeds.length > 0 && (
                    <Select value={feed} onValueChange={setFeed}>
                      <SelectTrigger aria-label={t`Feed`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {data.feeds.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className='flex gap-2 pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='flex-1'
                  onClick={() => void refuse()}
                  disabled={pending !== null}
                >
                  {pending === 'refuse' ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <X className='size-4' />
                  )}
                  <Trans>Refuse</Trans>
                </Button>
                <Button
                  type='button'
                  className='flex-1'
                  onClick={() => void approve()}
                  disabled={pending !== null || !chosen}
                >
                  {pending === 'approve' ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <Check className='size-4' />
                  )}
                  <Trans>Approve</Trans>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
