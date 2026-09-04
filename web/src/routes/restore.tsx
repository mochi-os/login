// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { createFileRoute } from '@tanstack/react-router'
import { requestHelpers } from '@mochi/web'
import { Loader2 } from 'lucide-react'
import { AuthLayout } from '@/features/auth/auth-layout'
import { appUrl } from '@/lib/redirect'

// Waiting page after POST /_/auth/restore. Polls /_/identity until the
// pending-restore placeholder turns active, then goes to the dashboard; a 401
// means the placeholder was deleted (restore failed). Progress comes from
// /_/auth/restore/progress.

type IdentityResponse = {
  user?: { email?: string; name?: string; status?: string }
  identity?: { name?: string; privacy?: 'public' | 'private' }
}

type ProgressResponse = {
  step: string
  percent: number
  detail: string
}

export const Route = createFileRoute('/restore')({
  // No beforeLoad guard: a guard fetching /_/identity here would bounce the
  // user to the landing on one transient failure. The poll below retries,
  // treats 401 as failure, and navigates when active.
  component: RestoringRouteComponent,
})

function RestoringRouteComponent() {
  const { t } = useLingui()
  const [failed, setFailed] = useState(false)
  const [progress, setProgress] = useState<ProgressResponse | null>(null)

  // Map the server's step codes to translated labels.
  const stepLabels: Record<string, string> = {
    validated: t`Validating backup`,
    verifying: t`Verifying backup`,
    unpacking: t`Unpacking your data`,
    linking: t`Linking your identity`,
    migrating: t`Finishing up`,
    done: t`Done`,
    error: t`Failed`,
  }

  useEffect(() => {
    // Effect-local, not a ref: StrictMode's dev double-effect runs cleanup
    // then the effect again on the same instance, and a ref stays true — the
    // second run must get its own false (same pattern as closing.tsx).
    let cancelled = false
    let identityTimer: ReturnType<typeof setTimeout> | null = null
    let progressTimer: ReturnType<typeof setTimeout> | null = null

    // A 401 from either endpoint means the placeholder user is gone: the
    // restore failed, and neither poll has anything left to ask. Both polls
    // check the flag again after their request, so whichever one is in flight
    // when the other fails stops too.
    const fail = () => {
      cancelled = true
      setFailed(true)
    }

    const pollIdentity = async () => {
      if (cancelled) return
      try {
        const data = await requestHelpers.get<IdentityResponse>('/_/identity')
        if (data.user?.status === 'active') {
          window.location.href = '/'
          return
        }
      } catch (err) {
        if (requestHelpers.isAuthError(err)) {
          fail()
          return
        }
      }
      if (cancelled) return
      identityTimer = setTimeout(pollIdentity, 1000)
    }

    const pollProgress = async () => {
      if (cancelled) return
      try {
        const data = await requestHelpers.get<ProgressResponse>('/_/auth/restore/progress')
        setProgress(data)
      } catch (err) {
        if (requestHelpers.isAuthError(err)) {
          fail()
          return
        }
        // transient - ignore, keep polling
      }
      if (cancelled) return
      progressTimer = setTimeout(pollProgress, 1000)
    }

    pollIdentity()
    pollProgress()

    return () => {
      cancelled = true
      if (identityTimer) clearTimeout(identityTimer)
      if (progressTimer) clearTimeout(progressTimer)
    }
  }, [])

  if (failed) {
    return (
      <AuthLayout>
        <div className='space-y-4'>
          <h1 className='text-lg font-semibold tracking-tight'>
            <Trans>Restore failed</Trans>
          </h1>
          <p className='text-muted-foreground text-sm'>
            <Trans>
              The restore did not complete. The backup file may be damaged, the passphrase
              may be wrong, or the server encountered an error.
            </Trans>
          </p>
          <a
            href={appUrl('')}
            className='text-primary text-sm underline-offset-4 hover:underline'
          >
            <Trans>Back to sign up</Trans>
          </a>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className='space-y-6'>
        <div className='space-y-2'>
          <h1 className='text-lg font-semibold tracking-tight'>
            <Trans>Restoring your account</Trans>
          </h1>
          <p className='text-muted-foreground text-sm'>
            <Trans>
              Your data is being restored from the backup. Do not close this window.
            </Trans>
          </p>
        </div>

        {progress && (
          <div className='space-y-2'>
            {progress.step && (
              <p className='text-sm font-medium'>
                {stepLabels[progress.step] ?? progress.step}
              </p>
            )}
            {progress.percent > 0 && (
              <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
                <div
                  className='bg-primary h-full rounded-full transition-all duration-300'
                  style={{ width: `${Math.min(100, progress.percent)}%` }}
                />
              </div>
            )}
            {progress.detail && (
              <p className='text-muted-foreground text-xs'>{progress.detail}</p>
            )}
          </div>
        )}

        <div className='text-muted-foreground flex items-center gap-2 text-sm'>
          <Loader2 className='h-4 w-4 animate-spin' />
          <span>
            <Trans>Checking…</Trans>
          </span>
        </div>
      </div>
    </AuthLayout>
  )
}
