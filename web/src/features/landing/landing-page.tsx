import { useState, useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import { AlertCircle, ArrowRight, Github, Key, Loader2 } from 'lucide-react'
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
import { ReplicateAdvanced } from '@/features/auth/sign-in/components/replicate-advanced'
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

function useLandingApps() {
  const { t } = useLingui()
  return [
    {
      name: t`Feeds`,
      icon: '\u{1F4E1}',
      desc: t`Publish your own social media feeds, follow others, or aggregate other feeds with optional AI tagging and sorting. Follow what matters, filter the noise.`,
    },
    {
      name: t`Forums`,
      icon: '\u{1F4AC}',
      desc: t`Create your own discussion forums, or join others. Use optional AI tagging and sorting to see what's important to you.`,
    },
    {
      name: t`Projects`,
      icon: '\u{1F4CB}',
      desc: t`Manage tickets and tasks in a friendly and highly flexible Kanban-style interface.`,
    },
    {
      name: t`CRM`,
      icon: '\u{1F91D}',
      desc: t`Keep track of contacts, relationships, and interactions with a highly adaptable CRM.`,
    },
    {
      name: t`Wikis`,
      icon: '\u{1F4D6}',
      desc: t`Build a collaborative, replicated knowledge base for your community. Your data is always yours.`,
    },
    {
      name: t`Chat`,
      icon: '\u{1F4E8}',
      desc: t`Message your friends, individually or in groups, peer-to-peer and encrypted.`,
    },
  ]
}

function useLandingSteps() {
  const { t } = useLingui()
  return [
    {
      title: t`Create your node`,
      desc: t`Sign up and your own Mochi node is created. Your data lives there \u2014 not on someone else's server.`,
    },
    {
      title: t`Use the apps`,
      desc: t`Feeds, forums, projects, CRM, wikis \u2014 all built in. Or write your own apps in Starlark.`,
    },
    {
      title: t`Connect with others`,
      desc: t`Add friends, join communities. Data syncs directly between nodes \u2014 peer-to-peer, end-to-end.`,
    },
  ]
}

function useLandingTech() {
  const { t } = useLingui()
  // Tech stack names — never translated.
  /* eslint-disable lingui/no-unlocalized-strings */
  return [
    { name: 'Go', role: t`Server` },
    { name: 'libp2p', role: t`Networking` },
    { name: 'SQLite', role: t`Storage` },
    { name: 'Starlark', role: t`App business logic` },
    { name: 'React', role: t`App user interfaces` },
  ]
  /* eslint-enable lingui/no-unlocalized-strings */
}

export function LandingPage() {
  const { t } = useLingui()
  const apps = useLandingApps()
  const steps = useLandingSteps()
  const tech = useLandingTech()
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
  const [replicateSourceUsername, setReplicateSourceUsername] = useState('')
  const [replicateSourcePeer, setReplicateSourcePeer] = useState('')

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

  return (
    <div className="min-h-svh bg-[#FAF9F6] dark:bg-background text-[#2D2D3A] dark:text-foreground">
      {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
      <style>{`
        @keyframes landing-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      {/* Top actions — scroll with page */}
      <div className="max-w-[1100px] mx-auto px-8 pt-4 flex items-center justify-end gap-2">
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
        <div className="max-w-[1100px] mx-auto relative">
          <div
            className="inline-block mb-8"
            style={{ animation: 'landing-float 4s ease-in-out infinite' }}
          >
            <MochiLogo size={120} />
          </div>
          <h1 className="text-[clamp(2.2rem,5vw,3.5rem)] font-bold leading-[1.15] tracking-tight max-w-[700px] mx-auto mb-5">
            <Trans>Your apps, your platform, your network</Trans>
          </h1>
          <p className="text-lg text-[#6B6B80] dark:text-muted-foreground max-w-[560px] mx-auto mb-4 leading-relaxed">
            <Trans>Mochi is a federated, multi-user platform for distributed apps. Anyone can run their own server, and connect to any other user on the Mochi network. Anyone can create and publish apps.</Trans>
          </p>
        </div>
      </section>

      {/* Apps */}
      <section id="apps" className="py-12 px-8">
        <div className="max-w-[1100px] mx-auto">
          <p className="font-bold text-xs uppercase tracking-widest text-[#6C5CE7] mb-3">
            <Trans>Built-in apps</Trans>
          </p>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-tight mb-4">
            <Trans>Everything you need, nothing you don't control</Trans>
          </h2>
          <p className="text-[#6B6B80] dark:text-muted-foreground text-[1.05rem] max-w-[540px] leading-relaxed mb-8">
            <Trans>Mochi already ships with over 20 apps, with more being added frequently. Major apps include:</Trans>
          </p>
          <ul className="space-y-4 max-w-[600px]">
            {apps.map((app) => (
              <li key={app.name} className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{app.icon}</span>
                <div>
                  <span className="font-bold">{app.name}</span>
                  <span className="text-[#6B6B80] dark:text-muted-foreground"> &mdash; {app.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="py-12 px-8 bg-white dark:bg-card border-t border-b border-[#E8E6F0] dark:border-border"
      >
        <div className="max-w-[1100px] mx-auto">
          <p className="font-bold text-xs uppercase tracking-widest text-[#6C5CE7] mb-3">
            <Trans>How it works</Trans>
          </p>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-tight mb-4">
            <Trans>Distributed by design</Trans>
          </h2>
          <p className="text-[#6B6B80] dark:text-muted-foreground text-[1.05rem] max-w-[540px] leading-relaxed mb-8">
            <Trans>No central server holds your data. Each Mochi node is a full peer in the network, communicating directly with others via libp2p.</Trans>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#F4F2FF] dark:bg-primary/10 text-[#6C5CE7] font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="text-base font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-[#6B6B80] dark:text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech */}
      <section id="tech" className="py-12 px-8">
        <div className="max-w-[1100px] mx-auto">
          <p className="font-bold text-xs uppercase tracking-widest text-[#6C5CE7] mb-3">
            <Trans>Under the hood</Trans>
          </p>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-tight mb-4">
            <Trans>Built on solid foundations</Trans>
          </h2>
          <p className="text-[#6B6B80] dark:text-muted-foreground text-[1.05rem] max-w-[540px] leading-relaxed mb-8">
            <Trans>Mochi is built using the following technologies:</Trans>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {tech.map((item) => (
              <div
                key={item.name}
                className="bg-white dark:bg-card border border-[#E8E6F0] dark:border-border rounded-xl p-5 text-center hover:border-[#A29BFE] transition-colors"
              >
                <div className="font-bold text-[0.95rem] mb-1">{item.name}</div>
                <div className="text-xs text-[#6B6B80] dark:text-muted-foreground">
                  {item.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Early access */}
      <section className="py-12 px-8">
        <div className="max-w-[1100px] mx-auto">
          <div className="bg-gradient-to-br from-[#6C5CE7] to-[#7C6CF0] text-white rounded-[20px] p-14 max-sm:p-10 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-[250px] h-[250px] bg-white/[0.06] rounded-full" />
            <div className="absolute -bottom-[60px] -left-[60px] w-[180px] h-[180px] bg-white/[0.04] rounded-full" />
            <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-bold mb-3 relative">
              <Trans>Ready to try Mochi?</Trans>
            </h2>
            <div className="flex gap-4 justify-center flex-wrap relative mt-8">
              <button
                onClick={openDialog}
                className="inline-flex items-center px-6 py-2.5 rounded-[20px] bg-white text-[#6C5CE7] font-bold text-[0.95rem] hover:bg-white/90 transition-all cursor-pointer border-none"
              >
                <Trans>Create an account</Trans>
              </button>
              <a
                href="https://git.mochi-os.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-2.5 rounded-[20px] bg-white/15 text-white font-semibold text-[0.95rem] border-[1.5px] border-white/30 hover:bg-white/25 transition-all no-underline"
              >
                <Trans>View source code</Trans>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-8 text-center text-[#6B6B80] dark:text-muted-foreground text-sm space-y-2">
        <p className="space-x-2">
          <a href="/login/rules" className="hover:text-[#6C5CE7] transition-colors">
            <Trans>Server rules</Trans>
          </a>
          <span aria-hidden="true">·</span>
          <a href="/login/terms" className="hover:text-[#6C5CE7] transition-colors">
            <Trans>Terms and conditions</Trans>
          </a>
          <span aria-hidden="true">·</span>
          <a href="/login/privacy" className="hover:text-[#6C5CE7] transition-colors">
            <Trans>Privacy</Trans>
          </a>
        </p>
        {/* Copyright line — Mochi is a brand name, year is numeric. */}
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        <p>&copy; 2026 Mochi.</p>
      </footer>

      {/* Login dialog */}
      <ResponsiveDialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-[420px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle><Trans>Log in to Mochi</Trans></ResponsiveDialogTitle>
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
            replicateSourceUsername={replicateSourceUsername}
            replicateSourcePeer={replicateSourcePeer}
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
            </>
          )}
          {step === 'email' && (
            <ReplicateAdvanced
              username={replicateSourceUsername}
              onUsernameChange={setReplicateSourceUsername}
              peer={replicateSourcePeer}
              onPeerChange={setReplicateSourcePeer}
              disabled={oauthLoading !== null || isPasskeyLoading}
            />
          )}
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
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
