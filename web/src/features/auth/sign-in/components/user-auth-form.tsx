// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { requestCode, verifyCode, beginLogin, totpLogin, completeMfa, signupRestore } from '@/services/auth-service'
import { OauthButtons } from '@/features/auth/components/oauth-buttons'
import { Loader2, Mail, ArrowLeft, ArrowRight, Copy, Key } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { toast, getErrorMessage, cn, Button, Form, FormField, FormItem, FormMessage, FormControl, Input, InputOTP, InputOTPGroup, InputOTPSlot, shellClipboardWrite, Tooltip, TooltipTrigger, TooltipContent } from '@mochi/web'
import { safeRedirect } from '@/lib/redirect'

type EmailFormValues = { email: string }
type VerificationFormValues = { emailCode?: string; totpCode?: string }

/** Stable id for the email <form>. The Advanced disclosure renders
 * BELOW the passkey/oauth buttons (parent layout) for visual priority
 * but its inputs use the HTML5 `form="..."` attribute to associate
 * back to this form so they submit together — that's what gets the
 * username + peer ID into Chrome's autofill memory. Exported so the
 * parent can pass the same id to AccountSourceAdvanced. */
export const emailFormId = 'login-email-form'

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
  step?: 'email' | 'verification'
  setStep?: (step: 'email' | 'verification') => void
  onPasskeyLogin?: () => void
  disabled?: boolean
  /** When set, the submit routes through POST /_/auth/restore (multipart). */
  restoreBundle?: File | null
  restorePassphrase?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  step: externalStep,
  setStep: externalSetStep,
  onPasskeyLogin,
  disabled = false,
  restoreBundle = null,
  restorePassphrase = '',
  ...props
}: UserAuthFormProps) {
  const { t } = useLingui()
  const [isLoading, setIsLoading] = useState(false)
  const [internalStep, setInternalStep] = useState<'email' | 'verification'>('email')
  const [userEmail, setUserEmail] = useState('')
  const [requiredMethods, setRequiredMethods] = useState<string[]>([])
  const [allowedMethods, setAllowedMethods] = useState<string[]>([])
  const [offerOauth, setOfferOauth] = useState(false)
  const [codeSent, setCodeSent] = useState(false)

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
  // When nothing is required, any one allowed factor signs the user in, so we
  // offer each as a choice. Required factors are always a subset of allowed.
  const offerEmail = allowedMethods.includes('email')
  const offerTotp = allowedMethods.includes('totp')
  const offerPasskey = allowedMethods.includes('passkey')
  const offerCount =
    (offerEmail ? 1 : 0) + (offerTotp ? 1 : 0) + (offerPasskey ? 1 : 0)

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

  // Send (or resend) the emailed login code, surfacing the dev-mode code when
  // the server returns one. Marks codeSent so the verification step shows the
  // code input rather than the "Email me a code" button.
  async function sendCode(email: string) {
    const codeResult = await requestCode(email)
    const devCode = codeResult.data?.code
    const requestSucceeded =
      codeResult?.status?.toLowerCase() === 'ok' || Boolean(devCode)
    if (!requestSucceeded) return
    setCodeSent(true)
    toast.success(t`Code sent.`, {
      description: devCode ? (
        <div className='flex items-center gap-2'>
          <span><Trans>Your code is: {devCode}</Trans></span>
          <Tooltip>
            <TooltipTrigger asChild>
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
                aria-label={t`Copy code`}
              >
                <Copy className='h-3 w-3' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t`Copy code`}</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        t`Check your email.`
      ),
    })
  }

  // Step 1: Submit email to get required methods (or, when the Advanced
  // disclosure holds a restore bundle, run the restore signup instead).
  async function onSubmitEmail(data: EmailFormValues) {
    setIsLoading(true)
    setUserEmail(data.email)

    // Restore from backup bundle
    if (restoreBundle) {
      try {
        await signupRestore(data.email, restorePassphrase, restoreBundle)
        window.location.href = '/login/restore'
      } catch (error) {
        const responseData = (error as { response?: { data?: { error?: string } } })?.response?.data
        const code = (responseData as { error?: string } | undefined)?.error
        if (code === 'wrong_passphrase') {
          toast.error(t`Wrong passphrase`, {
            description: t`The passphrase you entered does not match the backup.`,
          })
        } else if (code === 'bundle_not_migration') {
          toast.error(t`Not a migration bundle`, {
            description: t`Upload a .zip file exported from Mochi's data export.`,
          })
        } else if (code === 'bundle_version' || code === 'bundle_schema_newer') {
          toast.error(t`Backup is too new`, {
            description: t`This backup was created by a newer version of Mochi. Update this server first.`,
          })
        } else if (code === 'entity_collision') {
          toast.error(t`Account already on this server`, {
            description: getErrorMessage(error, t`An account with this identity already exists here.`),
          })
        } else if (code === 'bundle_tampered') {
          toast.error(t`Backup file is corrupted`, {
            description: t`The file may be damaged or have been modified.`,
          })
        } else if (code === 'username_taken') {
          toast.error(t`Email already in use`, {
            description: t`Choose a different local email or log in instead.`,
          })
        } else if (code === 'bundle_required') {
          toast.error(t`No backup file selected`)
        } else if (code === 'signup_disabled') {
          toast.error(t`Registration disabled`, {
            description: getErrorMessage(error, t`New user signup is disabled.`),
          })
        } else {
          toast.error(t`Restore failed`, {
            description: getErrorMessage(error, t`Please try again or contact support.`),
          })
        }
      } finally {
        setIsLoading(false)
      }
      return
    }

    try {
      const result = await beginLogin(data.email)
      const required = result.methods
      const allowed = result.allowed ?? result.methods
      setRequiredMethods(required)
      setAllowedMethods(allowed)
      setOfferOauth(result.oauth === true)
      setCodeSent(false)

      // If passkey is required, the only way forward is the passkey ceremony.
      if (required.includes('passkey')) {
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

      // Auto-send the email code only when email is the single way in. When any
      // other factor is offered (or also required), wait for the user to pick
      // email ("Email me a code") - otherwise we send a code they may not use,
      // and if they pick a non-email factor its continuation sends a second one.
      const emailSole = allowed.length === 1 && allowed[0] === 'email'
      if (emailSole) {
        await sendCode(data.email)
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

  // Step 2: Submit whichever factor(s) the user provided. With nothing
  // strictly required, any one entered code completes the login; with both
  // email and authenticator required, entering both finishes 2FA in one go.
  async function onSubmitVerification(data: VerificationFormValues) {
    const emailCode = data.emailCode?.trim()
    const totpCode = data.totpCode?.trim()
    setIsLoading(true)

    try {
      // Email + authenticator both required and both entered: validate them
      // together so a single submit completes 2FA without the codes page.
      if (needsEmail && needsTotp && emailCode && totpCode) {
        const result = await verifyCode(emailCode)
        if (result.mfa && result.partial && result.remaining) {
          useAuthStore.getState().setMfa(result.partial, result.remaining)
          if (result.remaining.includes('totp')) {
            const totpResult = await completeMfa('totp', totpCode)
            if (totpResult.mfa && totpResult.remaining) {
              handleMfaRequired()
            } else if (totpResult.success) {
              await handleLoginSuccess()
            } else {
              toast.error(t`Invalid code`, {
                description: t`Please check your codes and try again.`,
              })
            }
            return
          }
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
        return
      }

      // An email code was entered: verify it. If another factor is still
      // required the server returns mfa and we continue on the codes page.
      if (emailCode) {
        const result = await verifyCode(emailCode)
        if (result.mfa && result.partial && result.remaining) {
          useAuthStore.getState().setMfa(result.partial, result.remaining)
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
        return
      }

      // An authenticator code was entered as a sole or first factor.
      if (totpCode) {
        const result = await totpLogin(userEmail, totpCode)
        if (result.mfa && result.partial && result.remaining) {
          handleMfaRequired()
          return
        }
        if (result.success) {
          await handleLoginSuccess()
        } else {
          toast.error(t`Invalid authenticator code`, {
            description: t`Please check your authenticator app and try again.`,
          })
        }
        return
      }

      toast.error(t`Enter a code to continue`)
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
    setAllowedMethods([])
    setOfferOauth(false)
    setCodeSent(false)
    verificationForm.reset()
  }

  // Verification step - show required method forms
  if (step === 'verification') {
    return (
      <div className={cn('grid gap-4', className)}>
        {needsEmail && needsTotp ? (
          <p className='text-muted-foreground text-sm text-center'>
            <Trans>Enter your email code and authenticator code</Trans>
          </p>
        ) : offerEmail && offerCount === 1 ? (
          <p className='text-muted-foreground text-sm text-center'>
            <Trans>Paste the login code you received by email</Trans>
          </p>
        ) : offerTotp && offerCount === 1 ? (
          <p className='text-muted-foreground text-sm text-center'>
            <Trans>Enter the code from your authenticator app</Trans>
          </p>
        ) : null}

        <Form {...verificationForm}>
          <form
            onSubmit={verificationForm.handleSubmit(onSubmitVerification)}
            className='grid gap-4'
          >
            {offerEmail &&
              (codeSent ? (
                <FormField
                  control={verificationForm.control}
                  name='emailCode'
                  render={({ field }) => (
                    <FormItem>
                      {offerCount > 1 && (
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
              ) : (
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={() => sendCode(userEmail)}
                  disabled={isLoading}
                >
                  <Mail className='h-4 w-4' />
                  <Trans>Email me a code</Trans>
                </Button>
              ))}

            {offerTotp && (
              <FormField
                control={verificationForm.control}
                name='totpCode'
                render={({ field }) => (
                  <FormItem className='flex flex-col items-center'>
                    {offerCount > 1 && (
                      <div className='relative w-full mb-2'>
                        <div className='absolute inset-0 flex items-center'>
                          <span className='w-full border-t' />
                        </div>
                        <div className='relative flex justify-center text-xs uppercase'>
                          <span className='bg-card text-muted-foreground px-2'>
                            <Trans>Or enter authenticator code</Trans>
                          </span>
                        </div>
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

            {(offerEmail || offerTotp) && (
              <Button type='submit' className='w-full' disabled={isLoading}>
                <Trans>Log in</Trans>
                {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight className="rtl:rotate-180" />}
              </Button>
            )}

            {(offerPasskey || offerOauth) && (
              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <span className='w-full border-t' />
                </div>
                <div className='relative flex justify-center text-xs uppercase'>
                  <span className='bg-card text-muted-foreground px-2'>
                    <Trans>Or log in with</Trans>
                  </span>
                </div>
              </div>
            )}

            {offerPasskey && (
              <Button
                type='button'
                variant='outline'
                className='w-full'
                onClick={() => onPasskeyLogin?.()}
                disabled={isLoading}
              >
                <Key className='h-4 w-4' />
                <Trans>Use a passkey</Trans>
              </Button>
            )}

            {offerOauth && (
              <OauthButtons email={userEmail} redirect={redirectTo} />
            )}

            <Button
              type='button'
              variant='ghost'
              onClick={goBackToEmail}
              className='w-full'
            >
              <ArrowLeft className="rtl:rotate-180" />
              <Trans>Back</Trans>
            </Button>

            <div className='pt-4 text-center'>
              <Link
                to='/recovery'
                search={redirectTo && redirectTo !== '/' ? { redirect: redirectTo } : {}}
                className='text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline'
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
        id={emailFormId}
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

