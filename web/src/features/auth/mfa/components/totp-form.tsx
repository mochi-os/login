import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowLeft, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
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
import { completeMfa } from '@/services/auth-service'

const totpSchema = z.object({
  code: z.string().length(6, 'Please enter a 6-digit code'),
})

interface TotpFormProps {
  onSuccess: () => void
  onBack?: () => void
  showBack?: boolean
}

export function TotpForm({ onSuccess, onBack, showBack = true }: TotpFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof totpSchema>>({
    resolver: zodResolver(totpSchema),
    defaultValues: { code: '' },
  })

  async function onSubmit(data: z.infer<typeof totpSchema>) {
    setIsLoading(true)

    try {
      const result = await completeMfa('totp', data.code)

      if (result.success) {
        toast.success('Verification successful')
        onSuccess()
      } else {
        toast.error('Invalid code', {
          description: 'Please check your authenticator app and try again.',
        })
        form.reset()
      }
    } catch (error) {
      const apiError = error as { data?: { error?: string } }
      const errorCode = apiError.data?.error

      if (errorCode === 'invalid_code') {
        toast.error('Invalid code', {
          description: 'Please check your authenticator app and try again.',
        })
      } else {
        toast.error('Verification failed', {
          description: 'Please try again.',
        })
      }
      form.reset()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='grid gap-4'>
      <div className='space-y-2 text-center'>
        <p className='text-muted-foreground text-sm'>
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
          <FormField
            control={form.control}
            name='code'
            render={({ field }) => (
              <FormItem className='flex flex-col items-center'>
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

          <div className='space-y-2'>
            <Button type='submit' className='w-full' disabled={isLoading}>
              Verify
              {isLoading ? (
                <Loader2 className='animate-spin' />
              ) : (
                <Smartphone />
              )}
            </Button>

{showBack && onBack && (
              <Button
                type='button'
                variant='ghost'
                onClick={onBack}
                className='w-full'
                disabled={isLoading}
              >
                Back to methods
                <ArrowLeft className='ml-2 h-4 w-4' />
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}
