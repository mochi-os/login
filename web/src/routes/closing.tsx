import { useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { createFileRoute } from '@tanstack/react-router'
import { RotateCcw } from 'lucide-react'
import { Button, getErrorMessage, requestHelpers, toast, useFormat } from '@mochi/web'
import { AuthLayout } from '@/features/auth/auth-layout'

// The reactivation interstitial. A user whose account is pending closure
// (status='closing') re-authenticated and was routed here instead of into
// the app. They can cancel the closure and restore full access, or continue
// closing and sign out. The grace-period purge happens server-side; this
// page is the self-service escape hatch during the window.

type IdentityResponse = {
  user?: { email?: string; name?: string; status?: string; purge?: number }
}

export const Route = createFileRoute('/closing')({
  // No beforeLoad guard (mirrors /restore and /replicating): this page is
  // reached right after a redirect, and a guard that fetched /_/identity and
  // redirected on the result races the just-confirmed session — a transient
  // hiccup bounces the user to the landing. Resolve status in the component
  // instead: only a closing account stays here; anyone else leaves.
  component: ClosingRouteComponent,
})

function ClosingRouteComponent() {
  const { t } = useLingui()
  const { formatDate } = useFormat()
  const [purge, setPurge] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    let cancelled = false
    requestHelpers
      .get<IdentityResponse>('/_/identity')
      .then((data) => {
        if (cancelled) return
        if (data.user?.status !== 'closing') {
          // Not (or no longer) closing — go to the normal destination.
          window.location.href = '/'
          return
        }
        setPurge(data.user?.purge ?? null)
        setReady(true)
      })
      .catch(() => {
        // No valid session — back to login.
        if (!cancelled) window.location.href = '/login/'
      })
    return () => {
      cancelled = true
    }
  }, [])

  const reactivate = async () => {
    setWorking(true)
    try {
      await requestHelpers.post('/_/auth/close/cancel', {})
      toast.success(t`Your account has been reactivated`)
      window.location.href = '/'
    } catch (error) {
      toast.error(getErrorMessage(error, t`Could not reactivate your account`))
      setWorking(false)
    }
  }

  const signOut = async () => {
    setWorking(true)
    try {
      await requestHelpers.post('/_/logout', {})
    } catch {
      // Going to login regardless — the goal is to leave this session.
    }
    window.location.href = '/login/'
  }

  // Resolving status (or redirecting away) — render nothing rather than flash
  // the interstitial to a non-closing user.
  if (!ready) return null

  const purgeDate = purge !== null ? formatDate(new Date(purge * 1000)) : ''

  return (
    <AuthLayout>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h1 className='text-lg font-semibold tracking-tight'>
            <Trans>Your account is scheduled for deletion</Trans>
          </h1>
          <p className='text-muted-foreground text-sm break-words'>
            {purge ? (
              <Trans>Your account and all its data will be permanently deleted on {purgeDate}.</Trans>
            ) : (
              <Trans>Your account is scheduled for deletion.</Trans>
            )}
          </p>
        </div>

        <div className='space-y-2'>
          <Button
            type='button'
            className='w-full'
            disabled={working}
            onClick={reactivate}
          >
            <RotateCcw className='size-4' />
            <Trans>Reactivate my account</Trans>
          </Button>
          <Button
            type='button'
            variant='outline'
            className='w-full'
            disabled={working}
            onClick={signOut}
          >
            <Trans>Continue closing and sign out</Trans>
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}
