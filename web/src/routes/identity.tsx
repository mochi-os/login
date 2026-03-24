import { useEffect } from 'react'
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

export const Route = createFileRoute('/identity')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search, location }) => {
    const store = useAuthStore.getState()

    if (!store.isInitialized) {
      store.initialize()
    }

    // Verify session with the server (in-memory store doesn't survive page reloads)
    try {
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
      store.setAuth(nextUser)

      if (data.identity?.name && data.identity.privacy) {
        store.setIdentity(data.identity.name, data.identity.privacy)
      } else {
        store.clearIdentity()
      }
    } catch {
      // No valid session — redirect to login
      throw redirect({
        to: '/',
        search: {
          redirect: search.redirect ?? location.href,
        },
      })
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
            Finish setting up your account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <IdentityForm redirectTo={redirectTo} />

        </CardContent>
      </Card>
    </AuthLayout>
  )
}

