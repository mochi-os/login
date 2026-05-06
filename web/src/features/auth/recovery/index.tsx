import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, toast, getErrorMessage, Button, Form, FormField, FormItem, FormControl, FormMessage, Input } from '@mochi/web'
import { AuthLayout } from '../auth-layout'
import { useAuthStore } from '@/stores/auth-store'
import { recoveryLogin } from '@/services/auth-service'
import { safeRedirect } from '@/lib/redirect'
import { Route } from '@/routes/recovery'

type RecoveryFormValues = { code: string }

export function Recovery() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuthStore()
  const userEmail = user?.email || ''

  const recoverySchema = useMemo(
    () =>
      z.object({
        code: z.string().min(1, t`Please enter your recovery code`),
      }),
    [t],
  )

  const form = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { code: '' },
  })

  const handleSuccess = async () => {
    toast.success(t`Logged in`, {
      description: t`Successfully signed in with recovery code`,
    })

    await new Promise((resolve) => setTimeout(resolve, 250))

    const store = useAuthStore.getState()
    const targetPath = safeRedirect(redirectTo)

    if (store.hasIdentity) {
      window.location.href = targetPath
    } else {
      navigate({
        to: '/identity',
        search: redirectTo && redirectTo !== '/' ? { redirect: redirectTo } : {},
        replace: true,
      })
    }
  }

  const handleCancel = () => {
    navigate({
      to: '/',
      search: redirectTo && redirectTo !== '/' ? { redirect: redirectTo } : {},
      replace: true,
    })
  }

  async function onSubmit(data: RecoveryFormValues) {
    setIsLoading(true)

    try {
      const result = await recoveryLogin(userEmail, data.code)

      if (result.success) {
        await handleSuccess()
      } else {
        toast.error(t`Invalid recovery code`, {
          description: t`Please check your recovery code and try again.`,
        })
      }
    } catch (error) {
      const responseData = (error as { response?: { data?: { error?: string } } })?.response?.data
      if (responseData?.error === 'suspended') {
        toast.error(t`Account suspended`, {
          description: getErrorMessage(error, t`Your account has been suspended.`),
        })
      } else {
        toast.error(t`Invalid recovery code`, {
          description: t`Please check your recovery code and try again.`,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardDescription>
            <Trans>Enter a recovery code for &quot;{userEmail}&quot; to sign in</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>

              <FormField
                control={form.control}
                name='code'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder={t`Recovery code`}
                        className='font-mono tracking-wider text-center'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type='submit' className='w-full' disabled={isLoading}>
                <Trans>Log in</Trans>
                {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight className="rtl:rotate-180" />}
              </Button>

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
          </Form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
