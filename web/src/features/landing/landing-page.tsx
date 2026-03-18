import { useState, useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Key, Loader2 } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
  getErrorMessage,
} from '@mochi/web'
import { UserAuthForm } from '@/features/auth/sign-in/components/user-auth-form'
import { passkeyLogin } from '@/services/auth-service'
import { safeRedirect } from '@/lib/redirect'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth-store'

function MochiLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="mg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEFEFE" />
          <stop offset="100%" stopColor="#F5F0E8" />
        </linearGradient>
        <radialGradient id="bg">
          <stop offset="0%" stopColor="#FFB5B5" stopOpacity={0.7} />
          <stop offset="100%" stopColor="#FFB5B5" stopOpacity={0} />
        </radialGradient>
      </defs>
      <path
        d="M16 2.5 C25.5 2.5, 30.5 9, 30.5 17.5 C30.5 25, 25 29.5, 16 29.5 C7 29.5, 1.5 25, 1.5 17.5 C1.5 9, 6.5 2.5, 16 2.5Z"
        fill="url(#mg)"
        stroke="#E0D8C8"
        strokeWidth={1}
      />
      <ellipse cx={12} cy={16} rx={2} ry={2.4} fill="#3D3D3D" />
      <ellipse cx={11.4} cy={15.2} rx={0.7} ry={0.9} fill="#FFFFFF" />
      <ellipse cx={20} cy={16} rx={2} ry={2.4} fill="#3D3D3D" />
      <ellipse cx={19.4} cy={15.2} rx={0.7} ry={0.9} fill="#FFFFFF" />
      <path
        d="M13.5 21 Q16 24, 18.5 21"
        fill="none"
        stroke="#3D3D3D"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <ellipse cx={7} cy={18.5} rx={3} ry={2} fill="url(#bg)" />
      <ellipse cx={25} cy={18.5} rx={3} ry={2} fill="url(#bg)" />
    </svg>
  )
}

const apps = [
  {
    name: 'Feeds',
    icon: '\u{1F4E1}',
    iconBg: 'bg-orange-50 dark:bg-orange-900/20',
    desc: 'Aggregate RSS, forums, and email into a single, unified stream. Follow what matters, filter the noise.',
  },
  {
    name: 'Forums',
    icon: '\u{1F4AC}',
    iconBg: 'bg-green-50 dark:bg-green-900/20',
    desc: 'Threaded discussions for your community or team. No ads, no algorithms \u2014 just conversation.',
  },
  {
    name: 'Projects',
    icon: '\u{1F4CB}',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    desc: 'Manage tasks, track progress, and organise work with a flexible project management tool.',
  },
  {
    name: 'CRM',
    icon: '\u{1F91D}',
    iconBg: 'bg-red-50 dark:bg-red-900/20',
    desc: 'Keep track of contacts, relationships, and interactions with a template-driven CRM that adapts to you.',
  },
  {
    name: 'Wikis',
    icon: '\u{1F4D6}',
    iconBg: 'bg-purple-50 dark:bg-purple-900/20',
    desc: 'Build a knowledge base for your team or community. Collaborative, searchable, and always yours.',
  },
]

const steps = [
  {
    title: 'Create your node',
    desc: "Sign up and your own Mochi node is created. Your data lives there \u2014 not on someone else's server.",
  },
  {
    title: 'Use the apps',
    desc: 'Feeds, forums, projects, CRM, wikis \u2014 all built in. Or write your own apps in Starlark.',
  },
  {
    title: 'Connect with others',
    desc: 'Add friends, join communities. Data syncs directly between nodes \u2014 peer-to-peer, end-to-end.',
  },
]

const tech = [
  { name: 'Go', role: 'Backend runtime' },
  { name: 'libp2p', role: 'P2P networking' },
  { name: 'Starlark', role: 'App scripting' },
  { name: 'React', role: 'Frontend UI' },
  { name: 'TypeScript', role: 'Frontend logic' },
]

export function LandingPage() {
  const { redirect, reauth } = useSearch({ from: '/' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [step, setStep] = useState<'email' | 'verification'>('email')
  const [passkeyEnabled, setPasskeyEnabled] = useState(false)
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)

  useEffect(() => {
    if (redirect || reauth) setDialogOpen(true)
  }, [redirect, reauth])

  useEffect(() => {
    authApi.getMethods().then((methods) => {
      setPasskeyEnabled(methods.passkey === true)
    })
  }, [])

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) setStep('email')
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
          toast.success('Logged in')
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
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('Passkey login cancelled')
      } else {
        toast.error(getErrorMessage(error, 'Passkey login failed'))
      }
    } finally {
      setIsPasskeyLoading(false)
    }
  }

  const openDialog = () => setDialogOpen(true)

  return (
    <div className="min-h-svh bg-[#FAF9F6] dark:bg-background text-[#2D2D3A] dark:text-foreground">
      <style>{`
        @keyframes landing-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#FAF9F6]/85 dark:bg-background/85 backdrop-blur-xl border-b border-[#E8E6F0] dark:border-border">
        <div className="max-w-[1100px] mx-auto px-8 h-16 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2.5 no-underline text-inherit"
          >
            <MochiLogo size={32} />
            <span className="font-bold text-xl tracking-tight">Mochi</span>
          </a>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#apps"
                className="text-sm font-medium text-[#6B6B80] hover:text-[#6C5CE7] transition-colors no-underline"
              >
                Apps
              </a>
              <a
                href="#how"
                className="text-sm font-medium text-[#6B6B80] hover:text-[#6C5CE7] transition-colors no-underline"
              >
                How it works
              </a>
              <a
                href="#tech"
                className="text-sm font-medium text-[#6B6B80] hover:text-[#6C5CE7] transition-colors no-underline"
              >
                Technology
              </a>
            </div>
            <button
              onClick={openDialog}
              className="inline-flex items-center px-5 py-2 rounded-[20px] bg-[#6C5CE7] text-white font-semibold text-sm shadow-[0_2px_12px_rgba(108,92,231,0.25)] hover:bg-[#5041C1] hover:shadow-[0_4px_20px_rgba(108,92,231,0.35)] hover:-translate-y-px transition-all cursor-pointer border-none"
            >
              Log in
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-20 px-8 text-center relative overflow-hidden">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse,rgba(108,92,231,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-[1100px] mx-auto relative">
          <div
            className="inline-block mb-8"
            style={{ animation: 'landing-float 4s ease-in-out infinite' }}
          >
            <MochiLogo size={120} />
          </div>
          <h1 className="text-[clamp(2.2rem,5vw,3.5rem)] font-bold leading-[1.15] tracking-tight max-w-[700px] mx-auto mb-5">
            Your apps, your data,
            <br />
            your{' '}
            <span className="bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE] bg-clip-text text-transparent">
              network
            </span>
          </h1>
          <p className="text-lg text-[#6B6B80] dark:text-muted-foreground max-w-[560px] mx-auto mb-10 leading-relaxed">
            Mochi is a decentralised application platform. Run your apps on your
            own node, keep your data under your control, and connect with others
            peer-to-peer.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={openDialog}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[20px] bg-[#6C5CE7] text-white font-semibold text-[0.95rem] shadow-[0_2px_12px_rgba(108,92,231,0.25)] hover:bg-[#5041C1] hover:shadow-[0_4px_20px_rgba(108,92,231,0.35)] hover:-translate-y-px transition-all cursor-pointer border-none"
            >
              Create an account
            </button>
            <a
              href="https://github.com/mochi-os"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[20px] bg-white dark:bg-card font-semibold text-[0.95rem] border-[1.5px] border-[#E8E6F0] dark:border-border hover:border-[#A29BFE] hover:text-[#6C5CE7] hover:-translate-y-px transition-all no-underline text-inherit"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              View source
            </a>
          </div>
          <div className="inline-flex items-center gap-2 mt-12 px-4 py-1.5 bg-[#F4F2FF] dark:bg-primary/10 rounded-full text-[0.82rem] text-[#6C5CE7] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6C5CE7] animate-pulse" />
            Version 0.3 &mdash; Early access
          </div>
        </div>
      </section>

      {/* Apps */}
      <section id="apps" className="py-20 px-8">
        <div className="max-w-[1100px] mx-auto">
          <p className="font-bold text-xs uppercase tracking-widest text-[#6C5CE7] mb-3">
            Built-in apps
          </p>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-tight mb-4">
            Everything you need,
            <br />
            nothing you don&rsquo;t control
          </h2>
          <p className="text-[#6B6B80] dark:text-muted-foreground text-[1.05rem] max-w-[540px] leading-relaxed mb-12">
            Mochi ships with a set of apps that cover the essentials. Each one
            runs on your node, stores data locally, and syncs peer-to-peer with
            the people you choose.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {apps.map((app) => (
              <div
                key={app.name}
                className="bg-white dark:bg-card border border-[#E8E6F0] dark:border-border rounded-[20px] p-7 transition-all hover:border-[#A29BFE] hover:shadow-[0_4px_20px_rgba(108,92,231,0.08)] hover:-translate-y-0.5"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-xl ${app.iconBg}`}
                >
                  {app.icon}
                </div>
                <h3 className="text-[1.05rem] font-bold mb-2">{app.name}</h3>
                <p className="text-sm text-[#6B6B80] dark:text-muted-foreground leading-relaxed">
                  {app.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="py-20 px-8 bg-white dark:bg-card border-t border-b border-[#E8E6F0] dark:border-border"
      >
        <div className="max-w-[1100px] mx-auto">
          <p className="font-bold text-xs uppercase tracking-widest text-[#6C5CE7] mb-3">
            How it works
          </p>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-tight mb-4">
            Decentralised by design
          </h2>
          <p className="text-[#6B6B80] dark:text-muted-foreground text-[1.05rem] max-w-[540px] leading-relaxed mb-12">
            No central server holds your data. Each Mochi node is a full peer in
            the network, communicating directly with others via libp2p.
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
      <section id="tech" className="py-20 px-8">
        <div className="max-w-[1100px] mx-auto">
          <p className="font-bold text-xs uppercase tracking-widest text-[#6C5CE7] mb-3">
            Under the hood
          </p>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-tight mb-4">
            Built on solid foundations
          </h2>
          <p className="text-[#6B6B80] dark:text-muted-foreground text-[1.05rem] max-w-[540px] leading-relaxed mb-8">
            Mochi is open-source and built with a stack designed for
            reliability, performance, and extensibility.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {tech.map((t) => (
              <div
                key={t.name}
                className="bg-white dark:bg-card border border-[#E8E6F0] dark:border-border rounded-xl p-5 text-center hover:border-[#A29BFE] transition-colors"
              >
                <div className="font-bold text-[0.95rem] mb-1">{t.name}</div>
                <div className="text-xs text-[#6B6B80] dark:text-muted-foreground">
                  {t.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Early access */}
      <section className="py-20 px-8">
        <div className="max-w-[1100px] mx-auto">
          <div className="bg-gradient-to-br from-[#6C5CE7] to-[#7C6CF0] text-white rounded-[20px] p-14 max-sm:p-10 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-[250px] h-[250px] bg-white/[0.06] rounded-full" />
            <div className="absolute -bottom-[60px] -left-[60px] w-[180px] h-[180px] bg-white/[0.04] rounded-full" />
            <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-bold mb-3 relative">
              Ready to try Mochi?
            </h2>
            <p className="opacity-90 text-[1.05rem] max-w-[500px] mx-auto mb-8 leading-relaxed relative">
              We&rsquo;re looking for early adopters who are willing to kick the
              tyres and give honest feedback. Version 0.3 is rough around the
              edges &mdash; but it works.
            </p>
            <div className="flex gap-4 justify-center flex-wrap relative">
              <button
                onClick={openDialog}
                className="inline-flex items-center px-6 py-2.5 rounded-[20px] bg-white text-[#6C5CE7] font-bold text-[0.95rem] hover:bg-white/90 transition-all cursor-pointer border-none"
              >
                Create an account
              </button>
              <a
                href="https://github.com/mochi-os"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-2.5 rounded-[20px] bg-white/15 text-white font-semibold text-[0.95rem] border-[1.5px] border-white/30 hover:bg-white/25 transition-all no-underline"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 text-center text-[#6B6B80] dark:text-muted-foreground text-sm">
        <div className="flex justify-center gap-8 mb-6 flex-wrap">
          <a
            href="https://mochi-os.org"
            className="text-[#6C5CE7] no-underline hover:underline"
          >
            App
          </a>
          <a
            href="https://github.com/mochi-os"
            className="text-[#6C5CE7] no-underline hover:underline"
          >
            GitHub
          </a>
          <a
            href="mailto:hello@mochi-os.org"
            className="text-[#6C5CE7] no-underline hover:underline"
          >
            Contact
          </a>
        </div>
        <p>&copy; 2026 Mochi. Your apps, your data, your network.</p>
      </footer>

      {/* Login dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Log in to Mochi</DialogTitle>
            {step === 'email' && (
              <DialogDescription>
                Enter your email address to log in or create an account
              </DialogDescription>
            )}
          </DialogHeader>
          <UserAuthForm
            redirectTo={redirect}
            step={step}
            setStep={setStep}
            onPasskeyLogin={handlePasskeyLogin}
          />
          {passkeyEnabled && step === 'email' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2">
                    Or
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handlePasskeyLogin}
                disabled={isPasskeyLoading}
              >
                Log in with passkey
                {isPasskeyLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Key />
                )}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
