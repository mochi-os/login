// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { Mfa } from '@/features/auth/mfa'
import { safeRedirect } from '@/lib/redirect'
import { authApi } from '@/api/auth'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/codes')({
  beforeLoad: async ({ search }) => {
    const store = useAuthStore.getState()

    // Sync from cookies if not initialized
    if (!store.isInitialized) {
      store.initialize()
    }

    // If already fully authenticated, redirect away
    if (store.isAuthenticated) {
      const targetPath = safeRedirect(search.redirect)

      if (!store.hasIdentity) {
        throw redirect({
          to: '/identity',
          search: { redirect: targetPath },
        })
      }

      window.location.replace(targetPath)
      // Return a pending promise to prevent route from rendering
      return new Promise(() => {})
    }

    // No client MFA state. A full-page navigation, refresh, or OAuth redirect
    // lands here that way (the store is rebuilt from cookies and never carried
    // the partial), so recover the pending partial from the server's
    // login_partial cookie before giving up.
    if (!store.mfa.required) {
      try {
        const { partial, remaining } = await authApi.getPartial()
        if (partial && remaining.length) {
          store.setMfa(partial, remaining)
          return
        }
      } catch {
        // No live partial — fall through to the login redirect.
      }
      throw redirect({
        to: '/',
        search: { redirect: search.redirect },
      })
    }
  },
  component: Mfa,
  validateSearch: searchSchema,
})
