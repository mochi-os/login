import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { Recovery } from '@/features/auth/recovery'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/recovery')({
  beforeLoad: ({ search }) => {
    const store = useAuthStore.getState()

    // Sync from cookies if not initialized
    if (!store.isInitialized) {
      store.syncFromCookie()
    }

    // If already authenticated, redirect away
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
  },
  component: Recovery,
  validateSearch: searchSchema,
})
