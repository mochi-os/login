import { useEffect, useRef, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Button, getErrorMessage, requestHelpers, toast } from '@mochi/web'
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

type ScopeProgress = {
  scope: 'files' | 'userdbs' | string
  state: '' | 'queued' | 'active' | 'done' | 'incomplete'
  remaining: number
  failed: number
}

type ProgressResponse = {
  user?: { status?: string }
  approved?: boolean
  scopes?: ScopeProgress[]
}

function ReplicatingRouteComponent() {
  const { t } = useLingui()
  const { source_user } = Route.useSearch()
  const [canceling, setCanceling] = useState(false)
  const [approved, setApproved] = useState(false)
  const [progress, setProgress] = useState<ScopeProgress[]>([])
  const cancelled = useRef(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const poll = async () => {
      if (cancelled.current) return
      try {
        const data = await requestHelpers.get<ProgressResponse>('/_/replication/progress')
        if (data.user?.status && data.user.status !== 'pending-replication') {
          window.location.href = '/'
          return
        }
        setApproved(Boolean(data.approved))
        if (data.scopes) {
          setProgress(data.scopes)
        }
      } catch (err) {
        // 401 = the placeholder user was deleted (link-denied applied
        // or the 1h expiry / 24h safety net fired): the session cookie
        // now points at nothing. Bounce back to login. Other errors
        // (network blip, 5xx) are transient — retry on the next tick.
        if (requestHelpers.isAuthError(err)) {
          window.location.href = '/login/?replicate=denied'
          return
        }
      }
      timer = setTimeout(poll, 3000)
    }
    // Poll immediately on mount, then every 3s — a freshly-approved
    // link should flip the page to "Syncing" within one tick, not
    // after a 5s blank wait.
    poll()
    return () => {
      cancelled.current = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  // `approved` comes straight from the server (a replication.db.hosts
  // row exists — apply_keys created it at approval time). It's true
  // for the whole bulk-transfer window, including the brief 'queued'
  // phase before the first manifest lands, so the headline flips to
  // "Syncing your data" the moment the source approves.
  const syncing = approved
  const anyFailed = progress.some((s) => s.failed > 0)
  const filesScope = progress.find((s) => s.scope === 'files')
  const dbsScope = progress.find((s) => s.scope === 'userdbs')

  return (
    <AuthLayout>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h1 className='text-lg font-semibold tracking-tight'>
            {syncing ? (
              <Trans>Syncing your data</Trans>
            ) : (
              <Trans>Waiting for approval</Trans>
            )}
          </h1>
          <p className='text-muted-foreground text-sm break-words'>
            {syncing ? (
              <Trans>
                Your account is being copied from the source server. We'll bring you to the dashboard once everything has arrived — don't close this tab.
              </Trans>
            ) : source_user ? (
              <Trans>
                We've sent a replication request for <span className='text-foreground font-medium break-all'>{source_user}</span>. Approve it on the source server's settings page to complete sign-up.
              </Trans>
            ) : (
              <Trans>
                We've sent a replication request to the source server. Approve it on the source server's settings page to complete sign-up.
              </Trans>
            )}
          </p>
        </div>

        {syncing && (
          <div className='text-muted-foreground space-y-1 text-sm'>
            {filesScope && (
              <ScopeRow
                label={t`Files`}
                state={filesScope.state}
                remaining={filesScope.remaining}
                failed={filesScope.failed}
              />
            )}
            {dbsScope && (
              <ScopeRow
                label={t`Databases`}
                state={dbsScope.state}
                remaining={dbsScope.remaining}
                failed={dbsScope.failed}
              />
            )}
            {anyFailed && (
              <p className='text-foreground/80 mt-2 text-xs'>
                <Trans>
                  Some transfers didn't complete on the first attempt. They'll be retried automatically.
                </Trans>
              </p>
            )}
          </div>
        )}

        <div className='text-muted-foreground flex items-center gap-2 text-sm'>
          <Loader2 className='h-4 w-4 animate-spin' />
          <span><Trans>Checking every few seconds…</Trans></span>
        </div>

        <Button
          type='button'
          variant='ghost'
          className='w-full'
          disabled={canceling || syncing}
          onClick={async () => {
            setCanceling(true)
            try {
              await abandonSignup()
              window.location.href = '/login/'
            } catch (error) {
              // 401 = the placeholder is already gone (deny propagated
              // first, or session expired): the cancel goal is already
              // achieved, so just go to the login page like the success
              // path.
              if (requestHelpers.isAuthError(error)) {
                window.location.href = '/login/'
                return
              }
              toast.error(getErrorMessage(error, t`Could not cancel`))
              setCanceling(false)
            }
          }}
        >
          <Trans>Cancel</Trans>
        </Button>
      </div>
    </AuthLayout>
  )
}

function ScopeRow({
  label,
  state,
  remaining,
  failed,
}: {
  label: string
  state: string
  remaining: number
  failed: number
}) {
  let statusText: React.ReactNode
  if (state === 'done' && failed === 0) {
    statusText = <Trans>Done</Trans>
  } else if (state === 'incomplete') {
    statusText = <Trans>Retrying {failed} item(s)</Trans>
  } else if (remaining > 0) {
    statusText = <Trans>{remaining} item(s) remaining</Trans>
  } else {
    statusText = <Trans>Starting…</Trans>
  }
  return (
    <div className='flex items-center justify-between'>
      <span className='text-foreground'>{label}</span>
      <span>{statusText}</span>
    </div>
  )
}
