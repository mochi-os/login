// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { resolveSession } from '@/services/auth-service'
import { safeRedirect } from '@/lib/redirect'
import { LandingPage } from '@/features/landing/landing-page'

const searchSchema = z.object({
  redirect: z.string().optional(),
  reauth: z.coerce.string().optional(),
})

export const Route = createFileRoute('/')({
  beforeLoad: async ({ search }) => {
    const store = useAuthStore.getState()

    // Sync from cookies if not initialized (handles page refresh)
    if (!store.isInitialized) {
      store.initialize()
    }

    // If server indicated reauth is needed (suspended, expired session, etc),
    // clear auth state to break redirect loop and show login form
    if (search.reauth) {
      store.clearAuth()
      return
    }

    // Always resolve the cookie session against the server — the store holds
    // no token, so on a page reload it cannot know the visitor is already
    // logged in. Anonymous visitors fall through to the login form.
    const session = await resolveSession()
    if (session) {
      // Account pending closure: route to the reactivation interstitial
      // rather than into the app.
      if (session.closing) {
        window.location.replace('/login/closing')
        return new Promise(() => {})
      }

      if (!session.hasIdentity) {
        const params = search.redirect ? `?redirect=${encodeURIComponent(search.redirect)}` : ''
        window.location.replace(`/login/identity${params}`)
        return new Promise(() => {})
      }

      // Redirect to the requested page or default app
      window.location.replace(safeRedirect(search.redirect))
      // Return a pending promise to prevent route from rendering
      return new Promise(() => {})
    }

    // Not authenticated, allow login page to render
  },
  component: LandingPage,
  validateSearch: searchSchema,
})
