// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect } from 'react'
import { Trans } from '@lingui/react/macro'
import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, requestHelpers } from '@mochi/web'
import { AuthLayout } from '@/features/auth/auth-layout'
import { IdentityForm } from '@/features/auth/identity-form'
import { useAuthStore } from '@/stores/auth-store'
import { safeRedirect } from '@/lib/redirect'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

type IdentityResponse = {
  user?: { email?: string; name?: string; status?: string }
  identity?: { name?: string; privacy?: 'public' | 'private' }
}

export const Route = createFileRoute('/identity')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search, location }) => {
    const store = useAuthStore.getState()

    if (!store.isInitialized) {
      store.initialize()
    }

    // Verify session with the server (in-memory store doesn't survive page
    // reloads). Only the request itself is inside the try — the router
    // redirects thrown below must not be swallowed and converted into the
    // no-session login redirect (that sent closing accounts back to the
    // login form instead of the reactivation interstitial).
    let data: IdentityResponse
    try {
      data = await requestHelpers.get<IdentityResponse>('/_/identity')
    } catch {
      // No valid session — redirect to login
      throw redirect({
        to: '/',
        search: {
          redirect: search.redirect ?? location.href,
        },
      })
    }

    // Account pending closure: route to the reactivation interstitial.
    if (data.user?.status === 'closing') {
      throw redirect({ to: '/closing' })
    }

    const nextUser = {
      ...(store.user || {}),
      ...(data.user?.email ? { email: data.user.email } : {}),
      ...(data.identity?.name
        ? { name: data.identity.name }
        : data.user?.name
          ? { name: data.user.name }
          : {}),
    }
    store.setAuth(nextUser)

    if (data.identity?.name && data.identity.privacy) {
      store.setIdentity(data.identity.name, data.identity.privacy)
    } else {
      store.clearIdentity()
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

