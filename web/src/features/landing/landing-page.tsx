import { useState, useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { ArrowRight, Key, Loader2 } from 'lucide-react'
import {
  Button,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
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
    desc: 'Publish your own social media feeds, follow others, or aggregate other feeds with optional AI tagging and sorting. Follow what matters, filter the noise.',
  },
  {
    name: 'Forums',
    icon: '\u{1F4AC}',
    desc: 'Create your own discussion forums, or join others. Use optional AI tagging and sorting to see what\'s important to you.',
  },
  {
    name: 'Projects',
    icon: '\u{1F4CB}',
    desc: 'Manage tickets and tasks in a friendly and highly flexible Kanban-style interface.',
  },
  {
    name: 'CRM',
    icon: '\u{1F91D}',
    desc: 'Keep track of contacts, relationships, and interactions with a highly adaptable CRM.',
  },
  {
    name: 'Wikis',
    icon: '\u{1F4D6}',
    desc: 'Build a collaborative, replicated knowledge base for your community. Your data is always yours.',
  },
  {
    name: 'Chat',
    icon: '\u{1F4E8}',
    desc: 'Message your friends, individually or in groups, peer-to-peer and encrypted.',
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
  { name: 'Go', role: 'Server' },
  { name: 'libp2p', role: 'Networking' },
  { name: 'SQLite', role: 'Storage' },
  { name: 'Starlark', role: 'App business logic' },
  { name: 'React', role: 'App user interfaces' },
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
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-[20px] bg-[#6C5CE7] text-white font-semibold text-sm shadow-[0_2px_12px_rgba(108,92,231,0.25)] hover:bg-[#5041C1] hover:shadow-[0_4px_20px_rgba(108,92,231,0.35)] hover:-translate-y-px transition-all cursor-pointer border-none"
            >
              Sign up or log in
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-12 px-8 text-center relative overflow-hidden">
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
            your platform
          </h1>
          <p className="text-lg text-[#6B6B80] dark:text-muted-foreground max-w-[560px] mx-auto mb-4 leading-relaxed">
            Mochi is a federated, multi-user platform for distributed apps.
            Anyone can run their own server, and connect to any other user on
            the Mochi network. Anyone can create and publish apps.
          </p>
          <p className="text-lg text-[#6B6B80] dark:text-muted-foreground max-w-[560px] mx-auto mb-4 leading-relaxed">
            Mochi is currently version 0.3. It&rsquo;s ready for day-to-day use
            if you&rsquo;re moderately technical, and tolerant of bugs. If
            you&rsquo;re a developer, it&rsquo;s also ready for you to create
            apps as long as you don&rsquo;t mind a few API changes.
          </p>
        </div>
      </section>

      {/* Apps */}
      <section id="apps" className="py-12 px-8">
        <div className="max-w-[1100px] mx-auto">
          <p className="font-bold text-xs uppercase tracking-widest text-[#6C5CE7] mb-3">
            Built-in apps
          </p>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-tight mb-4">
            Everything you need,
            <br />
            nothing you don&rsquo;t control
          </h2>
          <p className="text-[#6B6B80] dark:text-muted-foreground text-[1.05rem] max-w-[540px] leading-relaxed mb-8">
            Mochi already ships with over 20 apps, with more being added
            frequently. Major apps include:
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
            How it works
          </p>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-tight mb-4">
            Distributed by design
          </h2>
          <p className="text-[#6B6B80] dark:text-muted-foreground text-[1.05rem] max-w-[540px] leading-relaxed mb-8">
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
      <section id="tech" className="py-12 px-8">
        <div className="max-w-[1100px] mx-auto">
          <p className="font-bold text-xs uppercase tracking-widest text-[#6C5CE7] mb-3">
            Under the hood
          </p>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-tight mb-4">
            Built on solid foundations
          </h2>
          <p className="text-[#6B6B80] dark:text-muted-foreground text-[1.05rem] max-w-[540px] leading-relaxed mb-8">
            Mochi is built using the following technologies:
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
      <section className="py-12 px-8">
        <div className="max-w-[1100px] mx-auto">
          <div className="bg-gradient-to-br from-[#6C5CE7] to-[#7C6CF0] text-white rounded-[20px] p-14 max-sm:p-10 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-[250px] h-[250px] bg-white/[0.06] rounded-full" />
            <div className="absolute -bottom-[60px] -left-[60px] w-[180px] h-[180px] bg-white/[0.04] rounded-full" />
            <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-bold mb-3 relative">
              Ready to try Mochi?
            </h2>
            <p className="opacity-90 text-[1.05rem] max-w-[500px] mx-auto mb-8 leading-relaxed relative">
              We&rsquo;re looking for early adopters who are willing to give
              Mochi a try and give honest feedback. It&rsquo;s version 0.3 so
              has some bugs, but is ready for day-to-day use.
            </p>
            <div className="flex gap-4 justify-center flex-wrap relative">
              <button
                onClick={openDialog}
                className="inline-flex items-center px-6 py-2.5 rounded-[20px] bg-white text-[#6C5CE7] font-bold text-[0.95rem] hover:bg-white/90 transition-all cursor-pointer border-none"
              >
                Create an account
              </button>
              <a
                href="https://git.mochi-os.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-2.5 rounded-[20px] bg-white/15 text-white font-semibold text-[0.95rem] border-[1.5px] border-white/30 hover:bg-white/25 transition-all no-underline"
              >
                View source code
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-8 text-center text-[#6B6B80] dark:text-muted-foreground text-sm">
        <p>&copy; 2026 Mochi.</p>
      </footer>

      {/* Login dialog */}
      <ResponsiveDialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-[420px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Log in to Mochi</ResponsiveDialogTitle>
            {step === 'email' && (
              <ResponsiveDialogDescription>
                Enter your email address to log in or create an account
              </ResponsiveDialogDescription>
            )}
          </ResponsiveDialogHeader>
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
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
