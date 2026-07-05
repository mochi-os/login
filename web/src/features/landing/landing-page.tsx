// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { Fragment, useEffect, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Contact,
  Crown,
  GitBranch,
  Github,
  Key,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Rss,
  SquareKanban,
  Store,
} from 'lucide-react'
import {
  Button,
  LanguagePicker,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  getErrorMessage,
  toast,
} from '@mochi/web'
import { UserAuthForm } from '@/features/auth/sign-in/components/user-auth-form'
import {
  AccountSourceAdvanced,
  type AccountSource,
} from '@/features/auth/sign-in/components/account-source-advanced'
import {
  FacebookIcon,
  GoogleIcon,
  MicrosoftIcon,
  XIcon,
} from '@/features/auth/components/brand-icons'
import { passkeyLogin } from '@/services/auth-service'
import { safeRedirect } from '@/lib/redirect'
import { authApi } from '@/api/auth'
import { type OAuthProvider } from '@/api/types/auth'
import { oauthErrorMessage } from '@/lib/oauth-errors'
import { useAuthStore } from '@/stores/auth-store'

// Alphabetical by provider key; the filter below drops ones the operator
// hasn't enabled, so unused providers simply never appear in the row.
// Brand names — never translated.
/* eslint-disable lingui/no-unlocalized-strings */
const oauthProviders: Array<{
  key: OAuthProvider
  label: string
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}> = [
    { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
    { key: 'github', label: 'GitHub', Icon: Github },
    { key: 'google', label: 'Google', Icon: GoogleIcon },
    { key: 'microsoft', label: 'Microsoft', Icon: MicrosoftIcon },
    { key: 'x', label: 'X', Icon: XIcon },
  ]
/* eslint-enable lingui/no-unlocalized-strings */

function MochiLogo({
  size = 32,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <img
      src="/login/images/logo-header.png"
      alt="Mochi"
      width={size}
      height={size}
      className={className}
    />
  )
}

export function LandingPage() {
  const { t } = useLingui()
  const search = useSearch({ from: '/' }) as Record<string, string | undefined>
  const { redirect, reauth } = search

  const [dialogOpen, setDialogOpen] = useState(false)
  const [step, setStep] = useState<'email' | 'verification'>('email')
  const [passkeyEnabled, setPasskeyEnabled] = useState(false)
  const [enabledOauth, setEnabledOauth] = useState<Set<OAuthProvider>>(
    new Set()
  )
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [accountSource, setAccountSource] = useState<AccountSource>('none')
  const [restoreBundle, setRestoreBundle] = useState<File | null>(null)
  const [restorePassphrase, setRestorePassphrase] = useState('')

  const userEmail = useAuthStore((s) => s.user?.email)

  // reauth is a one-shot signal (server bounce or auth-manager logout); strip
  // it once consumed so reloads don't re-clear auth and the router's JSON
  // search serialization doesn't rewrite it as ?reauth=%221%22.
  useEffect(() => {
    if (redirect || reauth) {
      setDialogOpen(true)
    }
    if (reauth) {
      const params = new URLSearchParams(window.location.search)
      params.delete('reauth')
      const qs = params.toString()
      const next = qs
        ? `${window.location.pathname}?${qs}`
        : window.location.pathname
      window.history.replaceState({}, '', next + window.location.hash)
    }
  }, [redirect, reauth])

  // Surface a callback error from the server (e.g. ?oauth_error=email_exists).
  // Stored in state and rendered as a persistent alert inside the dialog so
  // it survives the post-redirect page flash and the dialog opening.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('oauth_error')

    if (!err) {
      return
    }

    const provider = params.get('provider') ?? undefined

    setOauthError(oauthErrorMessage(err, provider))

    params.delete('oauth_error')
    params.delete('provider')
    params.delete('email')

    const qs = params.toString()
    const next = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname

    window.history.replaceState({}, '', next + window.location.hash)
    setDialogOpen(true)
  }, [])

  useEffect(() => {
    authApi.getMethods().then((methods) => {
      setPasskeyEnabled(methods.passkey === true)

      const enabled = new Set<OAuthProvider>()

      if (methods.oauth) {
        for (const provider of oauthProviders) {
          if (methods.oauth[provider.key]) {
            enabled.add(provider.key)
          }
        }
      }

      setEnabledOauth(enabled)
    })
  }, [])

  const handleOauthLogin = async (provider: OAuthProvider) => {
    setOauthLoading(provider)

    try {
      const target = redirect ? safeRedirect(redirect) : '/'
      const { url } = await authApi.oauthBegin(provider, { target })

      window.location.href = url
    } catch (error) {
      setOauthLoading(null)
      toast.error(getErrorMessage(error, t`Could not start sign-in`))
    }
  }

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open)

    if (!open) {
      setStep('email')
      setOauthError(null)
      setAccountSource('none')
      setRestoreBundle(null)
      setRestorePassphrase('')
    }
  }

  const handlePasskeyLogin = async () => {
    setIsPasskeyLoading(true)

    try {
      const result = await passkeyLogin()

      if (result.success) {
        if (result.mfa) {
          const codesParams = redirect
            ? `?redirect=${encodeURIComponent(redirect)}`
            : ''

          window.location.replace(`/login/codes${codesParams}`)
        } else {
          toast.success(t`Logged in`)

          await new Promise((resolve) => setTimeout(resolve, 250))

          const { hasIdentity } = useAuthStore.getState()
          const targetPath = safeRedirect(redirect)

          if (hasIdentity) {
            window.location.href = targetPath
          } else {
            const identityParams =
              targetPath && targetPath !== '/'
                ? `?redirect=${encodeURIComponent(targetPath)}`
                : ''

            window.location.replace(`/login/identity${identityParams}`)
          }
        }
      }
    } catch (error) {
      const message = getErrorMessage(error, t`Passkey login failed`)

      if (
        typeof error === 'object' &&
        error !== null &&
        (error as { name?: string }).name === 'NotAllowedError'
      ) {
        toast.error(t`Passkey login cancelled`)
      } else {
        toast.error(message)
      }
    } finally {
      setIsPasskeyLoading(false)
    }
  }

  const openDialog = () => setDialogOpen(true)

  const apps = [
    { label: t`Chat`, Icon: MessageSquare },
    { label: t`CRM`, Icon: Contact },
    { label: t`Feeds`, Icon: Rss },
    { label: t`Forums`, Icon: MessagesSquare },
    { label: t`Games`, Icon: Crown },
    { label: t`Git repositories`, Icon: GitBranch },
    { label: t`Market`, Icon: Store },
    { label: t`Projects`, Icon: SquareKanban },
    { label: t`Wikis`, Icon: BookOpen },
  ]

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden text-foreground">
      {/* Page background (colour + the theme's gentle gradient) comes from the
          body via the theme variables - see styles/index.css. */}

      {/* Top actions */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between md:justify-end gap-2 px-4 pt-4 sm:gap-3 sm:px-6 sm:pt-5 lg:px-8">
        <LanguagePicker />

        <Button type="button" variant="outline" onClick={openDialog} className="h-9">
          <Trans>Sign up or log in</Trans>
          <ArrowRight className="size-4 shrink-0 rtl:rotate-180" />
        </Button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-10 pt-2 sm:px-6 sm:pb-16 sm:pt-4 lg:px-8">
        <section className="mx-auto w-full max-w-5xl text-center">
          <div className="mb-6 flex justify-center sm:mb-8">
            <MochiLogo
              size={120}
              className="h-24 w-24 object-contain sm:h-28 sm:w-28 lg:h-[120px] lg:w-[120px]"
            />
          </div>

          <h1 className="mx-auto mb-5 max-w-[850px] bg-gradient-to-br from-foreground to-muted-foreground/30 bg-clip-text text-balance text-[2.25rem] font-light leading-[1.08] tracking-[3px] text-transparent sm:mb-6 sm:text-5xl lg:text-[3.5rem]">
            mochi
          </h1>

          <p className="mx-auto mb-7 max-w-[820px] text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            <Trans>
              Mochi is an open source, federated, multi-user platform for
              distributed
              apps. Anyone can run their own server, and connect to any other
              user on the Mochi network. Anyone can create and publish apps.
              Every app is replaceable, even system ones. The server comes with
              over 20 apps, including:
            </Trans>
          </p>

          {/* Mobile: readable app cards. Desktop: compact inline list. */}
          <div className="mx-auto grid max-w-md grid-cols-2 gap-2 text-sm text-muted-foreground sm:max-w-3xl sm:grid-cols-3 sm:text-base md:flex md:max-w-5xl md:flex-wrap md:items-center md:justify-center md:gap-x-2 md:gap-y-3">
            {apps.map(({ label, Icon }, i) => (
              <Fragment key={label}>
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className="hidden text-muted-foreground/60 md:inline"
                  >
                    ·
                  </span>
                )}

                <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border/70 bg-card/40 px-3 py-2 md:min-h-0 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0">
                  <Icon className="size-4 shrink-0 sm:size-5" />
                  <span>{label}</span>
                </span>
              </Fragment>
            ))}
          </div>

          <p className="mx-auto mt-7 max-w-[820px] text-pretty text-base leading-7 text-muted-foreground sm:mt-8 sm:text-lg sm:leading-8">
            <Trans>
              Create a{' '}
              <button
                type="button"
                onClick={openDialog}
                className="cursor-pointer underline underline-offset-4 transition-colors hover:text-primary"
              >
                free account
              </button>
              , run{' '}
              <a
                href="https://docs.mochi-os.org/install"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 transition-colors hover:text-primary"
              >
                your own server
              </a>
              , or explore the{' '}
              <a
                href="https://git.mochi-os.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 transition-colors hover:text-primary"
              >
                source code
              </a>
              .
            </Trans>
          </p>
        </section>
      </main>

      {/* Login dialog */}
      <ResponsiveDialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent
          className="sm:max-w-[420px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {step === 'verification' && userEmail ? (
                userEmail
              ) : (
                <Trans>Log in to Mochi</Trans>
              )}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          {oauthError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{oauthError}</span>
            </div>
          )}

          <UserAuthForm
            redirectTo={redirect}
            step={step}
            setStep={setStep}
            onPasskeyLogin={handlePasskeyLogin}
            disabled={oauthLoading !== null || isPasskeyLoading}
            restoreBundle={
              accountSource === 'restore' ? restoreBundle : null
            }
            restorePassphrase={
              accountSource === 'restore' ? restorePassphrase : ''
            }
          />

          {(passkeyEnabled || enabledOauth.size > 0) && step === 'email' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>

                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 py-2 text-muted-foreground">
                    <Trans>Or log in with</Trans>
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {passkeyEnabled && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handlePasskeyLogin}
                    disabled={isPasskeyLoading || oauthLoading !== null}
                  >
                    {isPasskeyLoading ? (
                      <Loader2 className="me-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Key className="me-2 h-5 w-5" />
                    )}

                    <Trans>Passkey</Trans>
                  </Button>
                )}

                {oauthProviders
                  .filter((provider) => enabledOauth.has(provider.key))
                  .map(({ key, label, Icon }) => (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      aria-label={t`Log in with ${label}`}
                      onClick={() => handleOauthLogin(key)}
                      disabled={oauthLoading !== null || isPasskeyLoading}
                    >
                      {oauthLoading === key ? (
                        <Loader2 className="me-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Icon className="me-2 h-5 w-5" />
                      )}

                      {label}
                    </Button>
                  ))}
              </div>
            </>
          )}

          {step === 'email' && (
            <AccountSourceAdvanced
              source={accountSource}
              onSourceChange={setAccountSource}
              restoreBundle={restoreBundle}
              onRestoreBundleChange={setRestoreBundle}
              restorePassphrase={restorePassphrase}
              onRestorePassphraseChange={setRestorePassphrase}
              disabled={oauthLoading !== null || isPasskeyLoading}
            />
          )}

          {step === 'email' && (
            <p className="space-x-2 pt-2 text-center text-xs text-muted-foreground">
              <a
                href="/login/rules"
                className="transition-colors hover:text-foreground"
              >
                <Trans>Server rules</Trans>
              </a>

              <span aria-hidden="true">·</span>

              <a
                href="/login/terms"
                className="transition-colors hover:text-foreground"
              >
                <Trans>Terms and conditions</Trans>
              </a>

              <span aria-hidden="true">·</span>

              <a
                href="/login/privacy"
                className="transition-colors hover:text-foreground"
              >
                <Trans>Privacy</Trans>
              </a>
            </p>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}