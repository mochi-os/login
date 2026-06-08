import { useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { createFileRoute, redirect } from '@tanstack/react-router'
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
  beforeLoad: async () => {
    try {
      const data = await requestHelpers.get<IdentityResponse>('/_/identity')
      // Only a closing account belongs here. Anyone else goes to the
      // normal post-login destination.
      if (data.user?.status !== 'closing') {
        throw redirect({ to: '/' })
      }
    } catch (error) {
      if ((error as { isRedirect?: boolean })?.isRedirect) throw error
      throw redirect({ to: '/' })
    }
  },
  component: ClosingRouteComponent,
})

function ClosingRouteComponent() {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const [purge, setPurge] = useState<number | null>(null)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    requestHelpers
      .get<IdentityResponse>('/_/identity')
      .then((data) => setPurge(data.user?.purge ?? null))
      .catch(() => {})
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

  return (
    <AuthLayout>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h1 className='text-lg font-semibold tracking-tight'>
            <Trans>Your account is scheduled for deletion</Trans>
          </h1>
          <p className='text-muted-foreground text-sm break-words'>
            {purge ? (
              <Trans>
                Your account and all its data will be permanently deleted on{' '}
                <span className='text-foreground font-medium'>{formatTimestamp(purge)}</span>. You can cancel and restore full access now.
              </Trans>
            ) : (
              <Trans>
                Your account is scheduled for deletion. You can cancel and restore full access now.
              </Trans>
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
