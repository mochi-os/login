import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { requestCode, verifyCode, beginLogin, totpLogin, completeMfa } from '@/services/auth-service'
import { Loader2, Mail, ArrowLeft, ArrowRight, Copy, Smartphone } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { toast, getErrorMessage, cn, Button, Form, FormField, FormItem, FormMessage, FormControl, Input, InputOTP, InputOTPGroup, InputOTPSlot, shellClipboardWrite } from '@mochi/web'
import { safeRedirect } from '@/lib/redirect'
const devConsole = globalThis.console

type EmailFormValues = { email: string }
type VerificationFormValues = { emailCode?: string; totpCode?: string }

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
  step?: 'email' | 'verification'
  setStep?: (step: 'email' | 'verification') => void
  onPasskeyLogin?: () => void
  disabled?: boolean
}

export function UserAuthForm({
  className,
  redirectTo,
  step: externalStep,
  setStep: externalSetStep,
  onPasskeyLogin,
  disabled = false,
  ...props
}: UserAuthFormProps) {
  const { t } = useLingui()
  const [isLoading, setIsLoading] = useState(false)
  const [internalStep, setInternalStep] = useState<'email' | 'verification'>('email')
  const [userEmail, setUserEmail] = useState('')
  const [requiredMethods, setRequiredMethods] = useState<string[]>([])
  const [emailVerified, setEmailVerified] = useState(false)

  // Use external step/setStep if provided, otherwise use internal state
  const step = externalStep ?? internalStep
  const setStep = externalSetStep ?? setInternalStep

  const emailSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t`Please enter a valid email`),
      }),
    [t],
  )

  const verificationSchema = useMemo(
    () =>
      z.object({
        emailCode: z.string().optional(),
        totpCode: z.string().optional(),
      }),
    [],
  )

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const verificationForm = useForm<VerificationFormValues>({
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
    const targetPath = safeRedirect(redirectTo)

    if (hasIdentity) {
      window.location.href = targetPath
    } else {
      const identityParams = targetPath && targetPath !== '/' ? `?redirect=${encodeURIComponent(targetPath)}` : ''
      window.location.replace(`/login/identity${identityParams}`)
    }
  }

  // Handle MFA redirect
  function handleMfaRequired() {
    const codesParams = redirectTo && redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
    window.location.replace(`/login/codes${codesParams}`)
  }

  // Step 1: Submit email to get required methods
  async function onSubmitEmail(data: EmailFormValues) {
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
          toast.error(t`Passkey login required`, {
            description: t`Please use the "Log in with passkey" button.`,
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
          toast.success(t`Code sent.`, {
            description: devCode ? (
              <div className='flex items-center gap-2'>
                <span><Trans>Your code is: {devCode}</Trans></span>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 w-6 p-0'
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const ok = await shellClipboardWrite(devCode!)
                    if (ok) {
                      toast.success(t`Code copied`)
                    } else {
                      toast.error(t`Failed to copy code`, {
                        description: t`Please copy manually: ${devCode}`,
                      })
                    }
                  }}
                >
                  <Copy className='h-3 w-3' />
                </Button>
              </div>
            ) : (
              t`Check your email.`
            ),
          })
        }
      }

      setStep('verification')
    } catch (error) {
      const responseData = (error as { response?: { data?: { error?: string } } })?.response?.data
      if (responseData?.error === 'signup_disabled') {
        toast.error(t`Registration disabled`, {
          description: getErrorMessage(error, t`New user signup is disabled.`),
        })
      } else {
        toast.error(t`Failed to continue`, {
          description: getErrorMessage(error, t`Please try again or contact support.`),
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Submit verification (email code and/or TOTP)
  async function onSubmitVerification(data: VerificationFormValues) {
    setIsLoading(true)

    try {
      // If only TOTP is required (no email), use the TOTP login endpoint
      if (needsTotp && !needsEmail) {
        if (!data.totpCode || data.totpCode.length !== 6) {
          toast.error(t`Please enter your authenticator code`)
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
          toast.error(t`Invalid authenticator code`, {
            description: t`Please check your authenticator app and try again.`,
          })
        }
        return
      }

      // If email was already verified (retry after TOTP failure), just verify TOTP
      if (emailVerified && needsTotp && data.totpCode) {
        try {
          const totpResult = await completeMfa('totp', data.totpCode)
          if (totpResult.mfa && totpResult.remaining) {
            handleMfaRequired()
            return
          } else if (totpResult.success) {
            await handleLoginSuccess()
            return
          } else {
            toast.error(t`Invalid code`, {
              description: t`Please check your authenticator code and try again.`,
            })
            return
          }
        } catch (err) {
          // eslint-disable-next-line lingui/no-unlocalized-strings
          devConsole.error('TOTP retry error:', err)
          toast.error(t`Invalid code`, {
            description: t`Please check your authenticator code and try again.`,
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
              if (totpResult.mfa && totpResult.remaining) {
                // Still more methods required
                handleMfaRequired()
                return
              } else if (totpResult.success) {
                await handleLoginSuccess()
                return
              } else {
                toast.error(t`Invalid code`, {
                  description: t`Please check your codes and try again.`,
                })
                return
              }
            } catch (err) {
              // eslint-disable-next-line lingui/no-unlocalized-strings
              devConsole.error('TOTP error:', err)
              toast.error(t`Invalid code`, {
                description: t`Please check your codes and try again.`,
              })
              return
            }
          }

          // TOTP not entered or not required, redirect to MFA page
          handleMfaRequired()
          return
        }

        if (result.success) {
          await handleLoginSuccess()
        } else {
          toast.error(t`Invalid verification code`, {
            description: result.message || t`Please check your email and try again.`,
          })
        }
      }
    } catch (error) {
      const responseData = (error as { response?: { data?: { error?: string } } })?.response?.data
      const errorCode = responseData?.error
      if (errorCode === 'suspended') {
        toast.error(t`Account suspended`, {
          description: getErrorMessage(error, t`Your account has been suspended.`),
        })
      } else if (errorCode === 'signup_disabled') {
        toast.error(t`Registration disabled`, {
          description: getErrorMessage(error, t`New user signup is disabled.`),
        })
      } else if (errorCode === 'invalid_code' || errorCode === 'invalid code') {
        toast.error(t`Invalid code`, {
          description: t`Please check your code and try again.`,
        })
      } else {
        toast.error(t`Verification failed`, {
          description: getErrorMessage(error, t`Please try again or contact support.`),
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
              <Trans>Enter your email code and authenticator code</Trans>
            </p>
          )}
          {needsEmail && !needsTotp && (
            <p className='text-muted-foreground text-sm'>
              <Trans>Paste the login code you received by email</Trans>
            </p>
          )}
          {needsTotp && !needsEmail && (
            <p className='text-muted-foreground text-sm'>
              <Trans>Enter the code from your authenticator app</Trans>
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
                        <span><Trans>Email code</Trans></span>
                      </div>
                    )}
                    <FormControl>
                      <Input
                        className='text-center font-mono tracking-wider'
                        autoComplete='one-time-code'
                        autoCorrect='off'
                        spellCheck={false}
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
                        <span><Trans>Authenticator code</Trans></span>
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
                <Trans>Log in</Trans>
                {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight className="rtl:rotate-180" />}
              </Button>

              <Button
                type='button'
                variant='ghost'
                onClick={goBackToEmail}
                className='w-full'
              >
                <Trans>Start again</Trans>
                <ArrowLeft className="rtl:rotate-180" />
              </Button>

            </div>

            <div className='pt-4 text-center'>
              <Link
                to='/recovery'
                search={redirectTo && redirectTo !== '/' ? { redirect: redirectTo } : {}}
                className='text-muted-foreground/70 hover:text-muted-foreground text-xs underline-offset-4 hover:underline'
              >
                <Trans>Lost access? Use a recovery code</Trans>
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
                <Input
                  placeholder={t`Email`}
                  type='email'
                  autoComplete='email'
                  disabled={disabled || isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className='mt-2' disabled={disabled || isLoading}>
          <Trans>Next</Trans>
          {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight className="rtl:rotate-180" />}
        </Button>
      </form>
    </Form>
  )
}
