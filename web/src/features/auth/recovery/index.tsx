import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader } from '@mochi/common'
import { Button } from '@mochi/common'
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from '@mochi/common'
import { Input } from '@mochi/common'
import { AuthLayout } from '../auth-layout'
import { useAuthStore } from '@/stores/auth-store'
import { recoveryLogin } from '@/services/auth-service'
import { Route } from '@/routes/recovery'

const recoverySchema = z.object({
  code: z.string().min(1, 'Please enter your recovery code'),
})

export function Recovery() {
  const navigate = useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuthStore()
  const userEmail = user?.email || ''

  const form = useForm<z.infer<typeof recoverySchema>>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { code: '' },
  })

  const handleSuccess = async () => {
    toast.success('Logged in', {
      description: 'Successfully signed in with recovery code',
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

  async function onSubmit(data: z.infer<typeof recoverySchema>) {
    setIsLoading(true)

    try {
      const result = await recoveryLogin(userEmail, data.code)

      if (result.success) {
        await handleSuccess()
      } else {
        toast.error('Invalid recovery code', {
          description: 'Please check your recovery code and try again.',
        })
      }
    } catch (error) {
      const apiError = error as { data?: { error?: string; message?: string } }
      const errorCode = apiError.data?.error
      const errorMessage = apiError.data?.message

      if (errorCode === 'suspended') {
        toast.error('Account suspended', {
          description: errorMessage || 'Your account has been suspended.',
        })
      } else {
        toast.error('Invalid recovery code', {
          description: 'Please check your recovery code and try again.',
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
            Enter a recovery code for "{userEmail}" to sign in
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
                        placeholder='Recovery code'
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
                Log in
                {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight />}
              </Button>

              <Button
                type='button'
                variant='ghost'
                onClick={handleCancel}
                className='w-full'
                disabled={isLoading}
              >
                Start again
                <ArrowLeft />
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
