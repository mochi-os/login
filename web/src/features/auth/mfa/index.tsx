import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { useAuthStore } from '@/stores/auth-store'
import { TotpForm } from './components/totp-form'
import { MethodSelector } from './components/method-selector'

interface MfaProps {
  redirectTo?: string
}

export function Mfa({ redirectTo }: MfaProps = {}) {
  const navigate = useNavigate()
  const { mfa } = useAuthStore()
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)

  const handleSuccess = async () => {
    // Small delay to ensure store state is updated
    await new Promise((resolve) => setTimeout(resolve, 250))

    const store = useAuthStore.getState()

    // Check if more MFA is required
    if (store.mfa.required) {
      setSelectedMethod(null)
      return
    }

    // Authentication complete
    const fallback = import.meta.env.VITE_DEFAULT_APP_URL || '/'
    const targetPath = redirectTo || fallback

    if (store.hasIdentity) {
      window.location.href = targetPath
    } else {
      navigate({
        to: '/identity',
        search: { redirect: targetPath },
        replace: true,
      })
    }
  }

  const handleBack = () => {
    setSelectedMethod(null)
  }

  // Show method-specific form
  if (selectedMethod === 'totp') {
    return (
      <AuthLayout>
        <Card className='gap-4'>
          <CardHeader>
            <CardDescription>
              Enter your authenticator code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TotpForm onSuccess={handleSuccess} onBack={handleBack} />
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  // Show method selector
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardDescription>
            Choose a verification method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MethodSelector
            methods={mfa.remaining}
            onSelect={setSelectedMethod}
            redirectTo={redirectTo}
          />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
