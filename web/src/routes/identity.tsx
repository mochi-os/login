// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect } from 'react'
import { Trans } from '@lingui/react/macro'
import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@mochi/web'
import { AuthLayout } from '@/features/auth/auth-layout'
import { IdentityForm } from '@/features/auth/identity-form'
import { useAuthStore } from '@/stores/auth-store'
import { resolveSession } from '@/services/auth-service'
import { safeRedirect } from '@/lib/redirect'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/identity')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search, location }) => {
    const store = useAuthStore.getState()

    if (!store.isInitialized) {
      store.initialize()
    }

    // Resolve the cookie session with the server (the in-memory store does
    // not survive page reloads) and sync the store from server truth.
    const session = await resolveSession()

    // No valid session — redirect to login
    if (!session) {
      throw redirect({
        to: '/',
        search: {
          redirect: search.redirect ?? location.href,
        },
      })
    }

    // Account pending closure: route to the reactivation interstitial.
    if (session.closing) {
      throw redirect({ to: '/closing' })
    }
  },
  component: IdentityRouteComponent,
})

function IdentityRouteComponent() {
  const searchParams = Route.useSearch()
  const redirectTo = safeRedirect(searchParams.redirect)
  const hasIdentity = useAuthStore((state) => state.hasIdentity)

  useEffect(() => {
    if (hasIdentity) {
      window.location.href = redirectTo
    }
  }, [hasIdentity, redirectTo])

  if (hasIdentity) {
    return null
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">
            <Trans>Finish setting up your account</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <IdentityForm redirectTo={redirectTo} />

        </CardContent>
      </Card>
    </AuthLayout>
  )
}

