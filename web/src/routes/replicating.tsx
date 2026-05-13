import { useEffect, useRef, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, getErrorMessage, requestHelpers, toast } from '@mochi/web'
import { Loader2 } from 'lucide-react'
import { AuthLayout } from '@/features/auth/auth-layout'
import { abandonSignup } from '@/services/auth-service'

// The waiting page the per-user signup Advanced disclosure lands on
// after /_/auth/replicate succeeds. We have a session cookie for a
// placeholder user in status='pending-replication'. The page polls
// /_/identity until the placeholder flips to active (the source
// approved the link-request and the keys-transfer ran), then bounces
// to the dashboard.

const searchSchema = z.object({
  source: z.string().optional(),
  source_user: z.string().optional(),
})

type IdentityResponse = {
  user?: { email?: string; name?: string; status?: string }
  identity?: { name?: string; privacy?: 'public' | 'private' }
}

export const Route = createFileRoute('/replicating')({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    try {
      const data = await requestHelpers.get<IdentityResponse>('/_/identity')
      // Session is valid but the user isn't pending-replication — they
      // belong on the regular identity/dashboard path, not this page.
      if (data.user?.status !== 'pending-replication') {
        throw redirect({ to: '/identity' })
      }
    } catch (error) {
      if ((error as { isRedirect?: boolean })?.isRedirect) throw error
      throw redirect({ to: '/' })
    }
  },
  component: ReplicatingRouteComponent,
})

function ReplicatingRouteComponent() {
  const { t } = useLingui()
  const { source, source_user } = Route.useSearch()
  const [canceling, setCanceling] = useState(false)
  const cancelled = useRef(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const poll = async () => {
      if (cancelled.current) return
      try {
        const data = await requestHelpers.get<IdentityResponse>('/_/identity')
        if (data.user?.status && data.user.status !== 'pending-replication') {
          window.location.href = '/'
          return
        }
      } catch {
        // Network blips are fine — try again on the next tick.
      }
      timer = setTimeout(poll, 5000)
    }
    timer = setTimeout(poll, 5000)
    return () => {
      cancelled.current = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  const sourceLabel = source_user && source ? `${source_user}@${source}` : null

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            <Trans>Waiting for approval</Trans>
          </CardTitle>
          <CardDescription>
            {sourceLabel ? (
              <Trans>
                We've sent a replication request to <span className='font-medium'>{sourceLabel}</span>. Approve it on the source server's settings page to complete sign-up.
              </Trans>
            ) : (
              <Trans>
                We've sent a replication request to the source server. Approve it on its settings page to complete sign-up.
              </Trans>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='text-muted-foreground flex items-center gap-2 text-sm'>
            <Loader2 className='h-4 w-4 animate-spin' />
            <span><Trans>Checking every few seconds…</Trans></span>
          </div>

          <Button
            type='button'
            variant='ghost'
            className='w-full'
            disabled={canceling}
            onClick={async () => {
              setCanceling(true)
              try {
                await abandonSignup()
                window.location.href = '/login/'
              } catch (error) {
                toast.error(getErrorMessage(error, t`Could not cancel`))
                setCanceling(false)
              }
            }}
          >
            <Trans>Cancel</Trans>
          </Button>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
