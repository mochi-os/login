// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { Recovery } from '@/features/auth/recovery'
import { resolveSession } from '@/services/auth-service'
import { safeRedirect } from '@/lib/redirect'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/recovery')({
  beforeLoad: async ({ search }) => {
    const store = useAuthStore.getState()

    // Sync from cookies if not initialized
    if (!store.isInitialized) {
      store.initialize()
    }

    // Already logged in (resolved against the server — the store cannot
    // know on a page reload): redirect away instead of offering recovery.
    const session = await resolveSession()
    if (session) {
      const targetPath = safeRedirect(search.redirect)

      if (!session.hasIdentity) {
        throw redirect({
          to: '/identity',
          search: { redirect: targetPath },
        })
      }

      window.location.href = targetPath
      return
    }

    // Recovery submits the store's email as the username, so without one the
    // page can only send "" and present a valid code as invalid. When neither
    // memory nor the profile cookie knows the email, the visitor must enter
    // it on the login form first.
    if (!useAuthStore.getState().user?.email) {
      throw redirect({
        to: '/',
        search: { redirect: search.redirect },
      })
    }
  },
  component: Recovery,
  validateSearch: searchSchema,
})
