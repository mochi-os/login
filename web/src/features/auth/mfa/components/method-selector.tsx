import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Key, Smartphone, FileKey, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'

interface MethodSelectorProps {
  methods: string[]
  onSelect: (method: string) => void
  redirectTo?: string
}

const methodLabels: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  totp: {
    label: 'Authenticator App',
    icon: Smartphone,
    description: 'Enter a code from your authenticator app',
  },
  passkey: {
    label: 'Passkey',
    icon: Key,
    description: 'Use your passkey or security key',
  },
  recovery: {
    label: 'Recovery Code',
    icon: FileKey,
    description: 'Use a backup recovery code',
  },
}

export function MethodSelector({ methods, onSelect, redirectTo }: MethodSelectorProps) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const { clearMfa } = useAuthStore()

  const handlePasskeyAuth = async () => {
    setIsLoading('passkey')
    try {
      const authApi = (await import('@/api/auth')).default

      // Begin passkey authentication for MFA
      const { mfa } = useAuthStore.getState()
      const response = await authApi.completeMfa({
        partial: mfa.partial,
        method: 'passkey',
      })

      // If the response contains passkey options, perform ceremony
      // Note: The backend should return options for passkey MFA
      // For now, we'll handle this as a direct completion

      if (response.mfa && response.remaining) {
        // More MFA required
        toast.info('Additional verification required')
      } else if (response.token) {
        toast.success('Verification successful')

        // Small delay for state update
        await new Promise((resolve) => setTimeout(resolve, 250))

        const store = useAuthStore.getState()
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Passkey verification failed'
      toast.error('Verification failed', { description: errorMessage })
    } finally {
      setIsLoading(null)
    }
  }

  const handleMethodClick = (method: string) => {
    if (method === 'passkey') {
      handlePasskeyAuth()
    } else {
      onSelect(method)
    }
  }

  const handleCancel = () => {
    clearMfa()
    navigate({
      to: '/',
      search: { redirect: redirectTo },
      replace: true,
    })
  }

  return (
    <div className='grid gap-3'>
      {methods.map((method) => {
        const config = methodLabels[method]
        if (!config) return null

        const Icon = config.icon
        const loading = isLoading === method

        return (
          <Button
            key={method}
            variant='outline'
            className='h-auto flex-col items-start gap-1 p-4'
            onClick={() => handleMethodClick(method)}
            disabled={isLoading !== null}
          >
            <div className='flex w-full items-center gap-3'>
              {loading ? (
                <Loader2 className='h-5 w-5 animate-spin' />
              ) : (
                <Icon className='h-5 w-5' />
              )}
              <div className='flex-1 text-left'>
                <div className='font-medium'>{config.label}</div>
                <div className='text-muted-foreground text-sm font-normal'>
                  {config.description}
                </div>
              </div>
            </div>
          </Button>
        )
      })}

      <Button
        variant='ghost'
        className='mt-2'
        onClick={handleCancel}
        disabled={isLoading !== null}
      >
        <ArrowLeft className='mr-2 h-4 w-4' />
        Cancel and start over
      </Button>
    </div>
  )
}
