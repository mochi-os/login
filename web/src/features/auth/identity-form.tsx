// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowRight } from 'lucide-react'
import { toast, getErrorMessage, Button, Input, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, RadioGroup, RadioGroupItem } from '@mochi/web'
import { submitIdentity, abandonSignup } from '@/services/auth-service'
import { safeRedirect } from '@/lib/redirect'
import { mergeProfileCookie, readProfileCookie } from '@/lib/profile-cookie'

type IdentityFormValues = {
  name: string
  privacy: 'public' | 'private'
}

interface IdentityFormProps {
  redirectTo?: string
}

export function IdentityForm({ redirectTo }: IdentityFormProps) {
  const { t } = useLingui()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const initialProfile = readProfileCookie()

  const identitySchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t`Please enter your name`),
        privacy: z.enum(['public', 'private']),
      }),
    [t],
  )

  const form = useForm<IdentityFormValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      name: initialProfile.name || '',
      privacy: 'public',
    },
  })

  const handleRedirect = (target?: string) => {
    window.location.href = safeRedirect(target)
  }

  const onSubmit = async (values: IdentityFormValues) => {
    setIsSubmitting(true)
    try {
      await submitIdentity(values)
      toast.success(t`Identity saved`, {
        description: t`Redirecting you to the dashboard…`,
      })
      handleRedirect(redirectTo)
    } catch (error) {
      toast.error(getErrorMessage(error, t`Failed to save identity`))
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
              <FormLabel><Trans>Your name, as you'd like others to see it</Trans></FormLabel>
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
              <FormLabel><Trans>Privacy</Trans></FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <FormItem className="space-y-0">
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border-2 p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10">
                      <FormControl>
                        <RadioGroupItem value="public" className="data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                      </FormControl>
                      <div className="space-y-1">
                        <span className="text-sm font-medium"><Trans>Public</Trans></span>
                        <p className="text-sm text-muted-foreground">
                          <Trans>Other users can find your profile.</Trans>
                        </p>
                      </div>
                    </label>
                  </FormItem>

                  <FormItem className="space-y-0">
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border-2 p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10">
                      <FormControl>
                        <RadioGroupItem value="private" className="data-[state=checked]:border-primary data-[state=checked]:bg-primary" />
                      </FormControl>
                      <div className="space-y-1">
                        <span className="text-sm font-medium"><Trans>Private</Trans></span>
                        <p className="text-sm text-muted-foreground">
                          <Trans>Stay hidden from directory searches.</Trans>
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
          <Trans>Continue</Trans>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <ArrowRight className="rtl:rotate-180" />}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          <Trans>
            By creating your account, you agree to the{' '}
            <a href="/login/rules" className="underline-offset-4 hover:underline">Server rules</a>,{' '}
            <a href="/login/terms" className="underline-offset-4 hover:underline">Terms and conditions</a>, and{' '}
            <a href="/login/privacy" className="underline-offset-4 hover:underline">Privacy</a>.
          </Trans>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          <button
            type="button"
            className="underline-offset-4 hover:underline disabled:opacity-60"
            disabled={isSubmitting}
            onClick={async () => {
              try {
                await abandonSignup()
                window.location.href = '/login/'
              } catch (error) {
                toast.error(getErrorMessage(error, t`Could not cancel`))
              }
            }}
          >
            <Trans>Use a different account</Trans>
          </button>
        </p>
      </form>
    </Form>
  )
}
