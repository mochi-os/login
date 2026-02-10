import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowRight } from 'lucide-react'
import { toast, getErrorMessage } from '@mochi/common'
import { submitIdentity } from '@/services/auth-service'
import { Button } from '@mochi/common'
import { Input } from '@mochi/common'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@mochi/common'
import {
  RadioGroup,
  RadioGroupItem,
} from '@mochi/common'
import { mergeProfileCookie, readProfileCookie } from '@/lib/profile-cookie'

const identitySchema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  privacy: z.enum(['public', 'private']),
})

type IdentityFormValues = z.infer<typeof identitySchema>

interface IdentityFormProps {
  redirectTo?: string
}

export function IdentityForm({ redirectTo }: IdentityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const initialProfile = readProfileCookie()

  const form = useForm<IdentityFormValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      name: initialProfile.name || '',
      privacy: 'public',
    },
  })

  const handleRedirect = (target?: string) => {
    const fallback = import.meta.env.VITE_DEFAULT_APP_URL || '/'
    const destination = target && target.length > 0 ? target : fallback
    window.location.href = destination
  }

  const onSubmit = async (values: IdentityFormValues) => {
    setIsSubmitting(true)
    try {
      await submitIdentity(values)
      toast.success('Identity saved', {
        description: 'Redirecting you to the dashboard…',
      })
      handleRedirect(redirectTo)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save identity'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form className="mt-6 space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your name, as you'd like others to see it</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  {...field}
                  onChange={(event) => {
                    field.onChange(event)
                    const nextName = event.target.value.trim()
                    mergeProfileCookie({ name: nextName || null })
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="privacy"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Privacy</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <FormItem className="space-y-0">
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border-2 p-3 has-[[data-state=checked]]:border-blue-500 has-[[data-state=checked]]:bg-blue-50 dark:has-[[data-state=checked]]:bg-blue-950">
                      <FormControl>
                        <RadioGroupItem value="public" className="data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500" />
                      </FormControl>
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Public</span>
                        <p className="text-sm text-muted-foreground">
                          Other users can find your profile.
                        </p>
                      </div>
                    </label>
                  </FormItem>

                  <FormItem className="space-y-0">
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border-2 p-3 has-[[data-state=checked]]:border-blue-500 has-[[data-state=checked]]:bg-blue-50 dark:has-[[data-state=checked]]:bg-blue-950">
                      <FormControl>
                        <RadioGroupItem value="private" className="data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500" />
                      </FormControl>
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Private</span>
                        <p className="text-sm text-muted-foreground">
                          Stay hidden from directory searches.
                        </p>
                      </div>
                    </label>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="w-full" disabled={isSubmitting}>
          Continue
          {isSubmitting ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </Button>
      </form>
    </Form>
  )
}
