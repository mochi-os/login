import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { Mfa } from '@/features/auth/mfa'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/mfa')({
  beforeLoad: ({ search }) => {
    const store = useAuthStore.getState()

    // Sync from cookies if not initialized
    if (!store.isInitialized) {
      store.syncFromCookie()
    }

    // If already fully authenticated, redirect away
    if (store.isAuthenticated) {
      const fallback = import.meta.env.VITE_DEFAULT_APP_URL || '/'
      const targetPath = search.redirect || fallback

      if (!store.hasIdentity) {
        throw redirect({
          to: '/identity',
          search: { redirect: targetPath },
        })
      }

      window.location.href = targetPath
      return
    }

    // If no MFA in progress, redirect to login
    if (!store.mfa.required) {
      throw redirect({
        to: '/',
        search: { redirect: search.redirect },
      })
    }
  },
  component: Mfa,
  validateSearch: searchSchema,
})
