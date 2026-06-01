import { Fragment, useState, useEffect } from 'react'
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
  toast,
  getErrorMessage,
} from '@mochi/web'
import { UserAuthForm } from '@/features/auth/sign-in/components/user-auth-form'
import { AccountSourceAdvanced, type AccountSource } from '@/features/auth/sign-in/components/account-source-advanced'
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
  { key: 'facebook', label: "Facebook", Icon: FacebookIcon },
  { key: 'github', label: "GitHub", Icon: Github },
  { key: 'google', label: "Google", Icon: GoogleIcon },
  { key: 'microsoft', label: "Microsoft", Icon: MicrosoftIcon },
  { key: 'x', label: 'X', Icon: XIcon },
]
/* eslint-enable lingui/no-unlocalized-strings */

function MochiLogo({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/login/images/logo-header.png"
      alt="Mochi"
      width={size}
      height={size}
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
  const [replicateSourceUsername, setReplicateSourceUsername] = useState('')
  const [replicateSourcePeer, setReplicateSourcePeer] = useState('')
  const [restoreBundle, setRestoreBundle] = useState<File | null>(null)
  const [restorePassphrase, setRestorePassphrase] = useState('')
  const userEmail = useAuthStore((s) => s.user?.email)

  useEffect(() => {
    if (redirect || reauth) setDialogOpen(true)
  }, [redirect, reauth])

  // Surface a callback error from the server (e.g. ?oauth_error=email_exists).
  // Stored in state and rendered as a persistent alert inside the dialog so
  // it survives the post-redirect page flash and the dialog opening.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('oauth_error')
    if (!err) return
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

  // Surface the per-user replicate-signup denial / expiry bounce
  // from /login/replicating: the page detected a 401 on /_/identity
  // (placeholder deleted) and redirected here with ?replicate=denied.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('replicate') !== 'denied') return
    toast.error(t`Replication request denied`, {
      description: t`The source server did not approve the request, or it expired. Try again or sign up locally.`,
    })
    params.delete('replicate')
    const qs = params.toString()
    const next = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname
    window.history.replaceState({}, '', next + window.location.hash)
    setDialogOpen(true)
  }, [t])

  useEffect(() => {
    authApi.getMethods().then((methods) => {
      setPasskeyEnabled(methods.passkey === true)
      const enabled = new Set<OAuthProvider>()
      if (methods.oauth) {
        for (const provider of oauthProviders) {
          if (methods.oauth[provider.key]) enabled.add(provider.key)
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
      if (typeof error === 'object' && error !== null && (error as { name?: string }).name === 'NotAllowedError') {
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
    <div className="min-h-svh text-[#2D2D3A] dark:text-foreground">
      {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
      <style>{`
        @keyframes landing-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      {/* Top actions — scroll with page */}
      <div className="px-8 pt-4 flex items-center justify-end gap-2">
        <LanguagePicker />
        <button
          onClick={openDialog}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-[20px] bg-[#6C5CE7] text-white font-semibold text-sm shadow-[0_2px_12px_rgba(108,92,231,0.25)] hover:bg-[#5041C1] hover:shadow-[0_4px_20px_rgba(108,92,231,0.35)] hover:-translate-y-px transition-all cursor-pointer border-none"
        >
          <Trans>Sign up or log in</Trans>
          <ArrowRight className="size-4 rtl:rotate-180" />
        </button>
      </div>

      {/* Hero */}
      <section className="pt-8 pb-12 px-8 text-center relative overflow-hidden">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse,rgba(108,92,231,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative">
          <div
            className="inline-block mb-8"
            style={{ animation: 'landing-float 4s ease-in-out infinite' }}
          >
            <MochiLogo size={120} />
          </div>
          <h1 className="text-[clamp(2.2rem,5vw,3.5rem)] font-bold leading-[1.15] tracking-tight max-w-[820px] mx-auto mb-5">
            <Trans>Your apps, your platform, your network</Trans>
          </h1>
          <p className="text-lg text-[#6B6B80] dark:text-muted-foreground max-w-[820px] mx-auto mb-4 leading-relaxed">
            <Trans>Mochi is an <a href="https://git.mochi-os.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#6C5CE7] transition-colors">open source</a>, federated, multi-user platform for distributed apps. Anyone can run their own server, and connect to any other user on the Mochi network. Anyone can create and publish apps. Every app is replaceable, even system ones. The server comes with over 20 apps, including:</Trans>
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-2 max-w-[960px] mx-auto text-lg text-[#6B6B80] dark:text-muted-foreground leading-relaxed">
            {apps.map(({ label, Icon }, i) => (
              <Fragment key={label}>
                {i > 0 && <span aria-hidden="true">·</span>}
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="size-5" />
                  {label}
                </span>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

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
            replicateSourceUsername={accountSource === 'replicate' ? replicateSourceUsername : ''}
            replicateSourcePeer={accountSource === 'replicate' ? replicateSourcePeer : ''}
            restoreBundle={accountSource === 'restore' ? restoreBundle : null}
            restorePassphrase={accountSource === 'restore' ? restorePassphrase : ''}
          />
          {(passkeyEnabled || enabledOauth.size > 0) && step === 'email' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2 py-2">
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
                  .filter((p) => enabledOauth.has(p.key))
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
              replicateUsername={replicateSourceUsername}
              onReplicateUsernameChange={setReplicateSourceUsername}
              replicatePeer={replicateSourcePeer}
              onReplicatePeerChange={setReplicateSourcePeer}
              restoreBundle={restoreBundle}
              onRestoreBundleChange={setRestoreBundle}
              restorePassphrase={restorePassphrase}
              onRestorePassphraseChange={setRestorePassphrase}
              disabled={oauthLoading !== null || isPasskeyLoading}
            />
          )}
          {step === 'email' && (
            <p className="text-center text-xs text-muted-foreground space-x-2 pt-2">
              <a href="/login/rules" className="hover:text-foreground transition-colors">
                <Trans>Server rules</Trans>
              </a>
              <span aria-hidden="true">·</span>
              <a href="/login/terms" className="hover:text-foreground transition-colors">
                <Trans>Terms and conditions</Trans>
              </a>
              <span aria-hidden="true">·</span>
              <a href="/login/privacy" className="hover:text-foreground transition-colors">
                <Trans>Privacy</Trans>
              </a>
            </p>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
