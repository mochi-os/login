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
  },
  component: Recovery,
  validateSearch: searchSchema,
})
