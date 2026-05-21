import { useState, useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import { Key, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, toast, getErrorMessage, Button } from '@mochi/web'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'
import { ReplicateAdvanced } from './components/replicate-advanced'
import { passkeyLogin } from '@/services/auth-service'
import { safeRedirect } from '@/lib/redirect'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth-store'

export function SignIn() {
  const { t } = useLingui()
  const { redirect } = useSearch({ from: '/' })
  const [step, setStep] = useState<'email' | 'verification'>('email')
  const [passkeyEnabled, setPasskeyEnabled] = useState(false)
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)
  const [replicateSourceUsername, setReplicateSourceUsername] = useState('')
  const [replicateSourcePeer, setReplicateSourcePeer] = useState('')

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
          const codesParams = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
          window.location.replace(`/login/codes${codesParams}`)
        } else {
          toast.success(t`Logged in`)
          await new Promise((resolve) => setTimeout(resolve, 250))
          const { hasIdentity } = useAuthStore.getState()
          const targetPath = safeRedirect(redirect)
          if (hasIdentity) {
            window.location.href = targetPath
          } else {
            const identityParams = targetPath && targetPath !== '/' ? `?redirect=${encodeURIComponent(targetPath)}` : ''
            window.location.replace(`/login/identity${identityParams}`)
          }
        }
      }
    } catch (error) {
      const message = getErrorMessage(error, t`Passkey login failed`)
      if (typeof error === 'object' && error !== null && (error as { name?: string }).name === 'NotAllowedError') {
        toast.error(t`Passkey login cancelled`)
      } else {
        toast.error(message)
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
              <Trans>Log in with your email address</Trans>
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className='space-y-4'>
          <UserAuthForm
            redirectTo={redirect}
            step={step}
            setStep={setStep}
            onPasskeyLogin={handlePasskeyLogin}
            replicateSourceUsername={replicateSourceUsername}
            replicateSourcePeer={replicateSourcePeer}
          />
          {passkeyEnabled && step === 'email' && (
            <>
              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <span className='w-full border-t' />
                </div>
                <div className='relative flex justify-center text-xs uppercase'>
                  <span className='bg-card text-muted-foreground px-2'>
                    <Trans>Or</Trans>
                  </span>
                </div>
              </div>
              <Button
                variant='outline'
                className='w-full'
                onClick={handlePasskeyLogin}
                disabled={isPasskeyLoading}
              >
                <Trans>Log in with passkey</Trans>
                {isPasskeyLoading ? (
                  <Loader2 className='animate-spin' />
                ) : (
                  <Key />
                )}
              </Button>
            </>
          )}
          {step === 'email' && (
            <ReplicateAdvanced
              username={replicateSourceUsername}
              onUsernameChange={setReplicateSourceUsername}
              peer={replicateSourcePeer}
              onPeerChange={setReplicateSourcePeer}
              disabled={isPasskeyLoading}
            />
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
