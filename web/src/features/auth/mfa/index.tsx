import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowLeft, Smartphone, Key } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { AuthLayout } from '../auth-layout'
import { useAuthStore } from '@/stores/auth-store'
import { completeMfa } from '@/services/auth-service'

const mfaSchema = z.object({
  totpCode: z.string().optional(),
})

interface MfaProps {
  redirectTo?: string
}

export function Mfa({ redirectTo }: MfaProps = {}) {
  const navigate = useNavigate()
  const { mfa, clearMfa } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [completedMethods, setCompletedMethods] = useState<string[]>([])

  const needsTotp = mfa.remaining.includes('totp')
  // TODO: Passkey MFA requires server-side implementation
  const needsPasskey = mfa.remaining.includes('passkey')

  const form = useForm<z.infer<typeof mfaSchema>>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { totpCode: '' },
  })

  const handleSuccess = async (name?: string) => {
    toast.success('Logged in', {
      description: name ? `Signed in as ${name}` : 'Successfully signed in',
    })

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

  const handleCancel = () => {
    clearMfa()
    navigate({
      to: '/',
      search: { redirect: redirectTo },
      replace: true,
    })
  }

  // TODO: Implement passkey MFA when server-side endpoints are available
  const handlePasskeyAuth = async () => {
    toast.error('Passkey MFA not yet implemented', {
      description: 'Please use another verification method.',
    })
  }

  async function onSubmit(data: z.infer<typeof mfaSchema>) {
    setIsLoading(true)

    try {
      if (needsTotp && data.totpCode) {
        const result = await completeMfa('totp', data.totpCode)

        if (result.mfa && result.remaining) {
          setCompletedMethods([...completedMethods, 'totp'])
          toast.info('Additional verification required')
          return
        }

        if (result.success) {
          await handleSuccess(result.name)
          return
        }

        toast.error('Invalid code', {
          description: 'Please check your authenticator code and try again.',
        })
      }
    } catch (error) {
      toast.error('Invalid code', {
        description: 'Please check your code and try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Build description based on remaining methods
  const getDescription = () => {
    const methods: string[] = []
    if (needsTotp) methods.push('authenticator code')
    if (needsPasskey) methods.push('passkey')

    if (methods.length === 1) {
      return `Enter your ${methods[0]}`
    }
    return `Enter your ${methods.slice(0, -1).join(', ')} and ${methods[methods.length - 1]}`
  }

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
              {needsTotp && (
                <FormField
                  control={form.control}
                  name='totpCode'
                  render={({ field }) => (
                    <FormItem className='flex flex-col items-center'>
                      {needsPasskey && (
                        <div className='mb-2 flex items-center gap-2 text-sm font-medium self-start'>
                          <Smartphone className='h-4 w-4' />
                          <span>Authenticator code</span>
                        </div>
                      )}
                      <FormControl>
                        <InputOTP
                          maxLength={6}
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isLoading}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {needsPasskey && (
                <div className='space-y-2'>
                  {needsTotp && (
                    <div className='mb-2 flex items-center gap-2 text-sm font-medium'>
                      <Key className='h-4 w-4' />
                      <span>Passkey</span>
                    </div>
                  )}
                  <Button
                    type='button'
                    variant='outline'
                    className='w-full'
                    onClick={handlePasskeyAuth}
                    disabled={isLoading}
                  >
                    Verify with passkey
                    {isLoading ? <Loader2 className='animate-spin' /> : <Key />}
                  </Button>
                </div>
              )}

              {needsTotp && (
                <Button type='submit' className='w-full' disabled={isLoading}>
                  Log in
                  {isLoading && <Loader2 className='animate-spin' />}
                </Button>
              )}

              <Button
                type='button'
                variant='ghost'
                onClick={handleCancel}
                className='w-full'
                disabled={isLoading}
              >
                Start again
                <ArrowLeft className='ml-2 h-4 w-4' />
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
