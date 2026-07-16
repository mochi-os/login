// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect, useRef, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { createFileRoute } from '@tanstack/react-router'
import { requestHelpers } from '@mochi/web'
import { Loader2 } from 'lucide-react'
import { AuthLayout } from '@/features/auth/auth-layout'

// Waiting page shown after POST /_/auth/restore succeeds. A session
// cookie for a placeholder user in status='pending-restore' is now set.
// The page polls /_/identity until the placeholder flips to active
// (restore finished), then navigates to the dashboard.
// It also polls /_/auth/restore/progress to show step / percent / detail.
// If /_/identity returns 401, the placeholder was deleted (restore failed).

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
  // No beforeLoad guard: this is a waiting page reached right after the
  // restore POST sets a pending-restore session, while the async swap is
  // still running. A guard that fetched /_/identity here and redirected
  // on any hiccup would bounce the user to the landing page on a single
  // transient failure (which is exactly what happened). The component's
  // poll below is resilient — it retries transient errors, treats 401 as
  // a failed restore, and navigates to the dashboard once status flips
  // to active — so it handles every case without losing the user.
  component: RestoringRouteComponent,
})

function RestoringRouteComponent() {
  const { t } = useLingui()
  const [failed, setFailed] = useState(false)
  const [progress, setProgress] = useState<ProgressResponse | null>(null)
  const cancelled = useRef(false)

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
    let identityTimer: ReturnType<typeof setTimeout> | null = null
    let progressTimer: ReturnType<typeof setTimeout> | null = null

    const pollIdentity = async () => {
      if (cancelled.current) return
      try {
        const data = await requestHelpers.get<IdentityResponse>('/_/identity')
        if (data.user?.status === 'active') {
          window.location.href = '/'
          return
        }
      } catch (err) {
        // 401 = placeholder deleted, restore failed
        if (requestHelpers.isAuthError(err)) {
          setFailed(true)
          return
        }
      }
      identityTimer = setTimeout(pollIdentity, 1000)
    }

    const pollProgress = async () => {
      if (cancelled.current) return
      try {
        const data = await requestHelpers.get<ProgressResponse>('/_/auth/restore/progress')
        setProgress(data)
      } catch {
        // transient — ignore, keep polling
      }
      progressTimer = setTimeout(pollProgress, 1000)
    }

    pollIdentity()
    pollProgress()

    return () => {
      cancelled.current = true
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
            href='/login/'
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
