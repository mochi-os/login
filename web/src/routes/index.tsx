import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { SignIn } from '@/features/auth/sign-in'

const searchSchema = z.object({
  redirect: z.string().optional(),
  reauth: z.string().optional(),
})

export const Route = createFileRoute('/')({
  beforeLoad: ({ search }) => {
    const store = useAuthStore.getState()

    // Sync from cookies if not initialized (handles page refresh)
    if (!store.isInitialized) {
      store.syncFromCookie()
    }

    // If server indicated reauth is needed (suspended, expired session, etc),
    // clear auth state to break redirect loop and show login form
    if (search.reauth) {
      store.clearAuth()
      return
    }

    // If already authenticated, redirect away from login page
    if (store.isAuthenticated) {
      if (!store.hasIdentity) {
        throw redirect({
          to: '/identity',
          search: {
            redirect: search.redirect,
          },
        })
      }

      // Redirect to the requested page or default app
      const targetUrl = search.redirect || import.meta.env.VITE_DEFAULT_APP_URL || '/'
      window.location.replace(targetUrl)
      // Return a pending promise to prevent route from rendering
      return new Promise(() => {})
    }

    // Not authenticated, allow login page to render
  },
  component: SignIn,
  validateSearch: searchSchema,
})
