import { useEffect } from 'react'
import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@mochi/common'
import { AuthLayout } from '@/features/auth/auth-layout'
import { IdentityForm } from '@/features/auth/identity-form'
import { useAuthStore } from '@/stores/auth-store'
import { safeRedirect } from '@/lib/redirect'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/identity')({
  validateSearch: searchSchema,
  beforeLoad: ({ search, location }) => {
    const store = useAuthStore.getState()

    if (!store.isInitialized) {
      store.initialize()
    }

    if (!store.isAuthenticated) {
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

