// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { resolveSession } from '@/services/auth-service'
import { useAuthStore } from '@/stores/auth-store'
import { appUrl } from '@/lib/redirect'
import { ConsentPage } from '@/features/consent/consent-page'

const searchSchema = z.object({
  request: z.string().optional(),
})

// Another app's sign-in lands here from core's authorization endpoint. The
// user signs in first where they are not: the login page returns them to this
// request once they have.
export const Route = createFileRoute('/oauth/consent')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const store = useAuthStore.getState()
    if (!store.isInitialized) {
      await store.initialize()
    }
    const session = await resolveSession()
    if (!session) {
      const here = `/oauth/consent?request=${encodeURIComponent(search.request ?? '')}`
      window.location.replace(
        appUrl(`?redirect=${encodeURIComponent(appUrl(here.slice(1)))}`)
      )
      return new Promise(() => {})
    }
  },
  component: ConsentPage,
})
