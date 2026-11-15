// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// Another app signing in to one of the user's hosted accounts: which app is
// asking, with what access, for which account, to allow or deny. When the app
// writes to a feed and the account has no home feed, the page asks for one
// (decision 42).
import { useEffect, useMemo, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ApiError,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
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
import { consentApi, type ConsentData } from '@/api/consent'
import { navigable } from '@/lib/redirect'
import { AuthLayout } from '@/features/auth/auth-layout'

// The home feed choice that makes a new feed, beside the existing feeds' ids.
const NEW = 'new'

// Where the browser goes once the request is answered: the client's redirect,
// which is not this origin and so is checked as a navigable URL first.
function leave(url: string) {
  if (navigable(url)) {
    window.location.href = url
  }
}

// The host of an app's website, which tells a real app from one borrowing its
// name; the address as given where it is not a URL.
function host(website: string) {
  try {
    return new URL(website).host
  } catch {
    return website
  }
}

export function ConsentPage() {
  const { t } = useLingui()
  const { request } = useSearch({ from: '/oauth/consent' })
  const [data, setData] = useState<ConsentData | null>(null)
  // '' for a request that is gone; otherwise what failed, in the server's words.
  const [failure, setFailure] = useState<string | null>(null)
  const [account, setAccount] = useState('')
  // The home feed chosen: an existing feed's id, or NEW.
  const [home, setHome] = useState('')
  const [pending, setPending] = useState<'allow' | 'deny' | null>(null)

  useEffect(() => {
    if (!request) {
      setFailure('')
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
        setHome(answer.feeds[0]?.id ?? NEW)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const status = error instanceof ApiError ? error.status : undefined
        setFailure(
          status === 404 || status === 400
            ? ''
            : getErrorMessage(error, t`Failed to load`)
        )
      })
    return () => {
      cancelled = true
    }
  }, [request, t])

  const chosen = useMemo(
    () => data?.request.accounts.find((a) => a.id === account),
    [data, account]
  )
  // The home feed question arises once: an app whose posts land in a feed, an
  // account with no home feed yet.
  const asksHome = !!data?.request.feed && !!chosen && !chosen.home

  const allow = async () => {
    if (!data || !chosen) return
    setPending('allow')
    try {
      const answer = await consentApi.approve({
        request: data.request.id,
        account: chosen.id,
        feed: asksHome && home !== NEW ? home : undefined,
        create: asksHome && home === NEW,
      })
      leave(answer.url)
    } catch (error) {
      setPending(null)
      toast.error(getErrorMessage(error, t`Could not approve the sign-in`))
    }
  }

  const deny = async () => {
    if (!data) return
    setPending('deny')
    try {
      const answer = await consentApi.refuse(data.request.id)
      leave(answer.url)
    } catch (error) {
      setPending(null)
      toast.error(getErrorMessage(error, t`Could not refuse the sign-in`))
    }
  }

  if (failure !== null || !data) {
    return (
      <AuthLayout compact>
        <Card>
          <CardContent>
            {failure !== null ? (
              <p className='text-muted-foreground text-sm'>
                {failure || <Trans>This request is no longer valid.</Trans>}
              </p>
            ) : (
              <div className='flex justify-center py-6'>
                <Loader2 className='size-5 animate-spin' />
              </div>
            )}
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  const name = data.request.client.name
  const network = providerName(data.request.network)
  const accounts = data.request.accounts

  return (
    <AuthLayout compact>
      <Card>
        <CardHeader>
          <CardTitle>
            {data.request.writes ? (
              <Trans>Allow {name} to read and post?</Trans>
            ) : (
              <Trans>Allow {name} to read?</Trans>
            )}
          </CardTitle>
          {data.request.client.website && (
            <p className='text-muted-foreground truncate text-sm'>
              {host(data.request.client.website)}
            </p>
          )}
        </CardHeader>
        <CardContent className='space-y-4'>
          {accounts.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              <Trans>You have no {network} account here.</Trans>
            </p>
          ) : accounts.length === 1 ? (
            <p className='truncate text-sm font-medium'>
              {accounts[0].identifier}
            </p>
          ) : (
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger aria-label={t`Account`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.identifier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {asksHome && (
            <div className='flex items-center gap-3'>
              <Label htmlFor='consent-home' className='shrink-0'>
                <Trans>Home feed</Trans>
              </Label>
              <Select value={home} onValueChange={setHome}>
                <SelectTrigger id='consent-home' className='min-w-0 flex-1'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.feeds.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW}>
                    <Trans>A new feed</Trans>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className='flex gap-2 pt-2'>
            <Button
              type='button'
              variant='outline'
              className='flex-1'
              onClick={() => void deny()}
              disabled={pending !== null}
            >
              {pending === 'deny' ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <X className='size-4' />
              )}
              <Trans>Deny</Trans>
            </Button>
            <Button
              type='button'
              className='flex-1'
              onClick={() => void allow()}
              disabled={pending !== null || !chosen}
            >
              {pending === 'allow' ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Check className='size-4' />
              )}
              <Trans>Allow</Trans>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
