// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useNavigate, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowLeft, ArrowRight, Smartphone, Key, Mail } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Button,
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  InputOTP,
  InputOTPGroup,
  toast,
  getErrorMessage,
  InputOTPSlot,
  Input,
} from '@mochi/web'
import { AuthLayout } from '../auth-layout'
import { useAuthStore } from '@/stores/auth-store'
import { completeMfa, completeMfaMultiple } from '@/services/auth-service'
import { safeRedirect } from '@/lib/redirect'

const mfaSchema = z.object({
  emailCode: z.string().optional(),
  totpCode: z.string().optional(),
})

interface MfaProps {
  redirectTo?: string
}

export function Mfa({ redirectTo }: MfaProps = {}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { mfa, clearMfa } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [completedMethods, setCompletedMethods] = useState<string[]>([])

  const remaining = mfa.remaining || []
  const needsEmail = remaining.includes('email')
  const needsTotp = remaining.includes('totp')
  // TODO: Passkey MFA requires server-side implementation
  const needsPasskey = remaining.includes('passkey')

  const form = useForm<z.infer<typeof mfaSchema>>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { emailCode: '', totpCode: '' },
  })

  const handleSuccess = async () => {
    await new Promise((resolve) => setTimeout(resolve, 250))

    const store = useAuthStore.getState()
    const targetPath = safeRedirect(redirectTo)

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
      search: redirectTo && redirectTo !== '/' ? { redirect: redirectTo } : {},
      replace: true,
    })
  }

  // TODO: Implement passkey MFA when server-side endpoints are available
  const handlePasskeyAuth = async () => {
    toast.error(t`Passkey MFA not yet implemented`, {
      description: t`Please use another verification method.`,
    })
  }

  async function onSubmit(data: z.infer<typeof mfaSchema>) {
    setIsLoading(true)

    try {
      // When both email and TOTP are required, validate both atomically
      if (needsEmail && needsTotp) {
        if (!data.emailCode || !data.totpCode) {
          toast.error(t`Invalid code`, {
            description: t`Please check your codes and try again.`,
          })
          return
        }

        const result = await completeMfaMultiple({
          email_code: data.emailCode,
          totp_code: data.totpCode,
        })

        if (result.mfa && result.remaining) {
          // More methods required (passkey?)
          setCompletedMethods([...completedMethods, 'email', 'totp'])
          return
        }

        if (result.success) {
          await handleSuccess()
          return
        }

        toast.error(t`Invalid code`, {
          description: t`Please check your codes and try again.`,
        })
        return
      }

      // Handle email-only verification
      if (needsEmail && data.emailCode) {
        const result = await completeMfa('email', data.emailCode)

        if (result.mfa && result.remaining) {
          setCompletedMethods([...completedMethods, 'email'])
          return
        }

        if (result.success) {
          await handleSuccess()
          return
        }

        toast.error(t`Invalid code`, {
          description: t`Please check your code and try again.`,
        })
        return
      }

      // Handle TOTP-only verification
      if (needsTotp && data.totpCode) {
        const result = await completeMfa('totp', data.totpCode)

        if (result.mfa && result.remaining) {
          setCompletedMethods([...completedMethods, 'totp'])
          return
        }

        if (result.success) {
          await handleSuccess()
          return
        }

        toast.error(t`Invalid code`, {
          description: t`Please check your code and try again.`,
        })
      }
    } catch (error) {
      const responseData = (error as { response?: { data?: { error?: string } } })?.response?.data
      if (responseData?.error === 'suspended') {
        toast.error(t`Account suspended`, {
          description: getErrorMessage(error, t`Your account has been suspended.`),
        })
      } else {
        toast.error(t`Invalid code`, {
          description: t`Please check your code and try again.`,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Build description based on remaining methods
  const getDescription = () => {
    const methods: string[] = []
    if (needsEmail) methods.push(t`email code`)
    if (needsTotp) methods.push(t`authenticator code`)
    if (needsPasskey) methods.push(t`passkey`)

    if (methods.length === 0) {
      return t`Complete verification to continue`
    }
    if (methods.length === 1) {
      return t`Enter your ${methods[0]}`
    }
    const initial = methods.slice(0, -1).join(', ')
    const last = methods[methods.length - 1]
    return t`Enter your ${initial} and ${last}`
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
              {needsEmail && (
                <FormField
                  control={form.control}
                  name='emailCode'
                  render={({ field }) => (
                    <FormItem>
                      {(needsTotp || needsPasskey) && (
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
                  control={form.control}
                  name='totpCode'
                  render={({ field }) => (
                    <FormItem className='flex flex-col items-center'>
                      {(needsEmail || needsPasskey) && (
                        <div className='mb-2 flex items-center gap-2 text-sm font-medium self-start'>
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

              {needsPasskey && (
                <div className='space-y-2'>
                  {(needsEmail || needsTotp) && (
                    <div className='mb-2 flex items-center gap-2 text-sm font-medium'>
                      <Key className='h-4 w-4' />
                      <span><Trans>Passkey</Trans></span>
                    </div>
                  )}
                  <Button
                    type='button'
                    variant='outline'
                    className='w-full'
                    onClick={handlePasskeyAuth}
                    disabled={isLoading}
                  >
                    <Trans>Verify with passkey</Trans>
                    {isLoading ? <Loader2 className='animate-spin' /> : <Key />}
                  </Button>
                </div>
              )}

              {(needsEmail || needsTotp) && (
                <Button type='submit' className='w-full' disabled={isLoading}>
                  <Trans>Log in</Trans>
                  {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight className="rtl:rotate-180" />}
                </Button>
              )}

              <Button
                type='button'
                variant='ghost'
                onClick={handleCancel}
                className='w-full'
                disabled={isLoading}
              >
                <Trans>Start again</Trans>
                <ArrowLeft className="rtl:rotate-180" />
              </Button>

            </form>

            <div className='pt-4 text-center'>
              <Link
                to='/recovery'
                search={redirectTo && redirectTo !== '/' ? { redirect: redirectTo } : {}}
                className='text-muted-foreground/70 hover:text-muted-foreground text-xs underline-offset-4 hover:underline'
              >
                <Trans>Lost access? Use a recovery code</Trans>
              </Link>
            </div>
          </Form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
