import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { requestHelpers } from '@mochi/web'
import { useAuthStore } from '@/stores/auth-store'
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

    // If already authenticated, verify token is still valid before redirecting
    if (store.isAuthenticated) {
      try {
        // Verify token and refresh identity state from server truth
        const data = await requestHelpers.get<{
          user?: { email?: string; name?: string }
          identity?: { name?: string; privacy?: 'public' | 'private' }
        }>('/_/identity')

        const nextUser = {
          ...(store.user || {}),
          ...(data.user?.email ? { email: data.user.email } : {}),
          ...(data.identity?.name
            ? { name: data.identity.name }
            : data.user?.name
              ? { name: data.user.name }
              : {}),
        }
        store.setUser(nextUser)

        if (data.identity?.name && data.identity.privacy) {
          store.setIdentity(data.identity.name, data.identity.privacy)
        } else {
          store.clearIdentity()
        }
      } catch {
        // Token is invalid/expired, clear auth and show login form
        store.clearAuth()
        return
      }

      if (!store.hasIdentity) {
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
