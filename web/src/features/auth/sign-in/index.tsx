import { useState, useEffect } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { Key, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'
import { passkeyLogin } from '@/services/auth-service'
import authApi from '@/api/auth'
import { useAuthStore } from '@/stores/auth-store'

export function SignIn() {
  const { redirect } = useSearch({ from: '/' })
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'verification'>('email')
  const [passkeyEnabled, setPasskeyEnabled] = useState(false)
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)

  useEffect(() => {
    authApi.getMethods().then((methods) => {
      setPasskeyEnabled(methods.passkey === true)
    })
  }, [])

  const handlePasskeyLogin = async () => {
    setIsPasskeyLoading(true)
    try {
      const result = await passkeyLogin()
      if (result.success) {
        if (result.mfa) {
          navigate({
            to: '/methods',
            search: { redirect },
            replace: true,
          })
        } else {
          toast.success('Logged in')
          await new Promise((resolve) => setTimeout(resolve, 250))
          const { hasIdentity } = useAuthStore.getState()
          const fallback = import.meta.env.VITE_DEFAULT_APP_URL || '/'
          const targetPath = redirect || fallback
          if (hasIdentity) {
            window.location.href = targetPath
          } else {
            navigate({
              to: '/identity',
              search: { redirect: targetPath },
              replace: true,
            })
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('Passkey login cancelled')
      } else {
        toast.error('Passkey login failed', {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    } finally {
      setIsPasskeyLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Card className='gap-4'>
        {step === 'email' && (
          <CardHeader>
            <CardDescription>
              Log in with your email address
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className='space-y-4'>
          <UserAuthForm
            redirectTo={redirect}
            step={step}
            setStep={setStep}
            onPasskeyLogin={handlePasskeyLogin}
          />
          {passkeyEnabled && step === 'email' && (
            <>
              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <span className='w-full border-t' />
                </div>
                <div className='relative flex justify-center text-xs uppercase'>
                  <span className='bg-card text-muted-foreground px-2'>
                    Or
                  </span>
                </div>
              </div>
              <Button
                variant='outline'
                className='w-full'
                onClick={handlePasskeyLogin}
                disabled={isPasskeyLoading}
              >
                Log in with passkey
                {isPasskeyLoading ? (
                  <Loader2 className='animate-spin' />
                ) : (
                  <Key />
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
