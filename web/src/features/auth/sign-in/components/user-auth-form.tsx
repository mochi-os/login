import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from '@tanstack/react-router'
import { requestCode, verifyCode, beginLogin, totpLogin, completeMfa } from '@/services/auth-service'
import { Loader2, Mail, ArrowLeft, ArrowRight, Copy, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn, Button, Form, FormField, FormItem, FormMessage, FormControl, Input } from '@mochi/common'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'

const devConsole = globalThis.console

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

const verificationSchema = z.object({
  emailCode: z.string().optional(),
  totpCode: z.string().optional(),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
  step?: 'email' | 'verification'
  setStep?: (step: 'email' | 'verification') => void
  onPasskeyLogin?: () => void
}

export function UserAuthForm({
  className,
  redirectTo,
  step: externalStep,
  setStep: externalSetStep,
  onPasskeyLogin,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [internalStep, setInternalStep] = useState<'email' | 'verification'>('email')
  const [userEmail, setUserEmail] = useState('')
  const [requiredMethods, setRequiredMethods] = useState<string[]>([])
  const [emailVerified, setEmailVerified] = useState(false)
  const navigate = useNavigate()

  // Use external step/setStep if provided, otherwise use internal state
  const step = externalStep ?? internalStep
  const setStep = externalSetStep ?? setInternalStep

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const verificationForm = useForm<z.infer<typeof verificationSchema>>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { emailCode: '', totpCode: '' },
  })

  const needsEmail = requiredMethods.includes('email')
  const needsTotp = requiredMethods.includes('totp')

  // Handle successful login completion
  async function handleLoginSuccess() {
    // Small delay to ensure store state is updated and cookies are synced
    await new Promise((resolve) => setTimeout(resolve, 250))

    const { hasIdentity } = useAuthStore.getState()
    const fallback = import.meta.env.VITE_DEFAULT_APP_URL || '/'
    const targetPath = redirectTo || fallback

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

  // Handle MFA redirect
  function handleMfaRequired() {
        navigate({
      to: '/codes',
      search: redirectTo && redirectTo !== '/' ? { redirect: redirectTo } : {},
      replace: true,
    })
  }

  // Step 1: Submit email to get required methods
  async function onSubmitEmail(data: z.infer<typeof emailSchema>) {
    setIsLoading(true)
    setUserEmail(data.email)

    try {
      const result = await beginLogin(data.email)
      setRequiredMethods(result.methods)

      // If passkey is required (alone or with other methods), trigger passkey login first
      if (result.methods.includes('passkey')) {
        setIsLoading(false)
        if (onPasskeyLogin) {
          onPasskeyLogin()
        } else {
          toast.error('Passkey login required', {
            description: 'Please use the "Log in with passkey" button.',
          })
        }
        return
      }

      // If email is required, send the code now
      if (result.methods.includes('email')) {
        const codeResult = await requestCode(data.email)
        const devCode = codeResult.data?.code
        const requestSucceeded =
          codeResult?.status?.toLowerCase() === 'ok' || Boolean(devCode)

        if (requestSucceeded) {
          toast.success('Code sent.', {
            description: devCode ? (
              <div className='flex items-center gap-2'>
                <span>Your code is: {devCode}</span>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 w-6 p-0'
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const code = devCode!

                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(code)
                        toast.success('Code copied to clipboard!')
                      } else {
                        const textArea = document.createElement('textarea')
                        textArea.value = code
                        textArea.style.position = 'fixed'
                        textArea.style.left = '-999999px'
                        textArea.style.top = '-999999px'
                        document.body.appendChild(textArea)
                        textArea.focus()
                        textArea.select()

                        try {
                          const successful = document.execCommand('copy')
                          if (successful) {
                            toast.success('Code copied to clipboard!')
                          } else {
                            throw new Error('Copy command failed')
                          }
                        } finally {
                          document.body.removeChild(textArea)
                        }
                      }
                    } catch (error) {
                      devConsole?.error?.('Failed to copy code:', error)
                      toast.error('Failed to copy code', {
                        description: 'Please copy manually: ' + code,
                      })
                    }
                  }}
                >
                  <Copy className='h-3 w-3' />
                </Button>
              </div>
            ) : (
              'Check your email.'
            ),
          })
        }
      }

      setStep('verification')
    } catch (error) {
      const apiError = error as { message?: string; data?: { error?: string; message?: string } }
      const errorCode = apiError.data?.error
      const errorMessage = apiError.data?.message || apiError.message

      if (errorCode === 'signup_disabled') {
        toast.error('Registration disabled', {
          description: errorMessage || 'New user signup is disabled.',
        })
      } else {
        toast.error('Failed to continue', {
          description: errorMessage || 'Please try again or contact support.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Submit verification (email code and/or TOTP)
  async function onSubmitVerification(data: z.infer<typeof verificationSchema>) {
    setIsLoading(true)

    try {
      // If only TOTP is required (no email), use the TOTP login endpoint
      if (needsTotp && !needsEmail) {
        if (!data.totpCode || data.totpCode.length !== 6) {
          toast.error('Please enter your authenticator code')
          setIsLoading(false)
          return
        }

        const result = await totpLogin(userEmail, data.totpCode)

        if (result.mfa && result.partial && result.remaining) {
          handleMfaRequired()
          return
        }

        if (result.login) {
          await handleLoginSuccess()
        } else {
          toast.error('Invalid authenticator code', {
            description: 'Please check your authenticator app and try again.',
          })
        }
        return
      }

      // If email was already verified (retry after TOTP failure), just verify TOTP
      if (emailVerified && needsTotp && data.totpCode) {
        try {
          const totpResult = await completeMfa('totp', data.totpCode)
          devConsole.log('TOTP retry result:', totpResult)
          if (totpResult.mfa && totpResult.remaining) {
            handleMfaRequired()
            return
          } else if (totpResult.success) {
            await handleLoginSuccess()
            return
          } else {
            toast.error('Invalid code', {
              description: 'Please check your authenticator code and try again.',
            })
            return
          }
        } catch (err) {
          devConsole.error('TOTP retry error:', err)
          toast.error('Invalid code', {
            description: 'Please check your authenticator code and try again.',
          })
          return
        }
      }

      // If email code is required, verify it first
      if (needsEmail && data.emailCode) {
        const result = await verifyCode(data.emailCode)

        // Check for MFA requirement (which would include TOTP if both are required)
        if (result.mfa && result.partial && result.remaining) {
          // Email verified successfully - mark it so retries skip email verification
          setEmailVerified(true)
          useAuthStore.getState().setMfa(result.partial, result.remaining)

          // If TOTP was also entered and is in remaining, complete it immediately
          if (data.totpCode && result.remaining.includes('totp')) {
            try {
              const totpResult = await completeMfa('totp', data.totpCode)
              devConsole.log('TOTP result:', totpResult)
              if (totpResult.mfa && totpResult.remaining) {
                // Still more methods required
                handleMfaRequired()
                return
              } else if (totpResult.success) {
                await handleLoginSuccess()
                return
              } else {
                toast.error('Invalid code', {
                  description: 'Please check your codes and try again.',
                })
                return
              }
            } catch (err) {
              devConsole.error('TOTP error:', err)
              toast.error('Invalid code', {
                description: 'Please check your codes and try again.',
              })
              return
            }
          }

          // TOTP not entered or not required, redirect to MFA page
          handleMfaRequired()
          return
        }

        if (result.success && result.token) {
          await handleLoginSuccess()
        } else {
          toast.error('Invalid verification code', {
            description: result.message || 'Please check your email and try again.',
          })
        }
      }
    } catch (error) {
      const apiError = error as { message?: string; data?: { error?: string; message?: string } }
      const errorCode = apiError.data?.error
      const errorMessage = apiError.data?.message || apiError.message

      if (errorCode === 'suspended') {
        toast.error('Account suspended', {
          description: errorMessage || 'Your account has been suspended.',
        })
      } else if (errorCode === 'signup_disabled') {
        toast.error('Registration disabled', {
          description: errorMessage || 'New user signup is disabled.',
        })
      } else if (errorCode === 'invalid_code' || errorCode === 'invalid code') {
        toast.error('Invalid code', {
          description: 'Please check your code and try again.',
        })
      } else {
        toast.error('Verification failed', {
          description: errorMessage || 'Please try again or contact support.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  function goBackToEmail() {
    setStep('email')
    setRequiredMethods([])
    setEmailVerified(false)
    verificationForm.reset()
  }

  // Verification step - show required method forms
  if (step === 'verification') {
    return (
      <div className={cn('grid gap-4', className)}>
        <div className='space-y-2 text-center'>
          <p className='text-sm font-medium'>{userEmail}</p>
          {needsEmail && needsTotp && (
            <p className='text-muted-foreground text-sm'>
              Enter your email code and authenticator code
            </p>
          )}
          {needsEmail && !needsTotp && (
            <p className='text-muted-foreground text-sm'>
              Paste the login code you received by email
            </p>
          )}
          {needsTotp && !needsEmail && (
            <p className='text-muted-foreground text-sm'>
              Enter the code from your authenticator app
            </p>
          )}
        </div>

        <Form {...verificationForm}>
          <form
            onSubmit={verificationForm.handleSubmit(onSubmitVerification)}
            className='grid gap-4'
          >
            {needsEmail && (
              <FormField
                control={verificationForm.control}
                name='emailCode'
                render={({ field }) => (
                  <FormItem>
                    {needsTotp && (
                      <div className='flex items-center gap-2 text-sm font-medium mb-2'>
                        <Mail className='h-4 w-4' />
                        <span>Email code</span>
                      </div>
                    )}
                    <FormControl>
                      <Input
                        placeholder='Email code'
                        className='text-center font-mono tracking-wider'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {needsTotp && (
              <FormField
                control={verificationForm.control}
                name='totpCode'
                render={({ field }) => (
                  <FormItem className='flex flex-col items-center'>
                    {needsEmail && (
                      <div className='flex items-center gap-2 text-sm font-medium mb-2 self-start'>
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

            <div className='space-y-2'>
              <Button type='submit' className='w-full' disabled={isLoading}>
                Log in
                {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight />}
              </Button>

              <Button
                type='button'
                variant='ghost'
                onClick={goBackToEmail}
                className='w-full'
              >
                Start again
                <ArrowLeft />
              </Button>

            </div>

            <div className='pt-4 text-center'>
              <Link
                to='/recovery'
                search={redirectTo && redirectTo !== '/' ? { redirect: redirectTo } : {}}
                className='text-muted-foreground/70 hover:text-muted-foreground text-xs underline-offset-4 hover:underline'
              >
                Lost access? Use a recovery code
              </Link>
            </div>
          </form>
        </Form>
      </div>
    )
  }

  // Email entry step
  return (
    <Form {...emailForm}>
      <form
        onSubmit={emailForm.handleSubmit(onSubmitEmail)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={emailForm.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder='Email' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className='mt-2' disabled={isLoading}>
          Next
          {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight />}
        </Button>
      </form>
    </Form>
  )
}
