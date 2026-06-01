// Mochi login: OAuth provider buttons for the verification step.
//
// Renders a "Continue with <provider>" button for each operator-enabled OAuth
// provider and starts the OAuth redirect. Shown in the email-login verification
// step when OAuth can verify the identified account; the typed email is passed
// through so the callback binds the sign-in to that account and rejects any
// other. (The landing screen keeps its own inline copy for the pre-email
// discoverable path, where no email is typed yet.)

import { useState, useEffect } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Github, Loader2 } from 'lucide-react'
import { Button, toast, getErrorMessage } from '@mochi/web'
import {
  FacebookIcon,
  GoogleIcon,
  MicrosoftIcon,
  XIcon,
} from '@/features/auth/components/brand-icons'
import { authApi } from '@/api/auth'
import { type OAuthProvider } from '@/api/types/auth'
import { safeRedirect } from '@/lib/redirect'

// Brand names are never translated.
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

export function OauthButtons({
  email,
  redirect,
}: {
  email?: string
  redirect?: string
}) {
  const { t } = useLingui()
  const [enabled, setEnabled] = useState<Set<OAuthProvider>>(new Set())
  const [loading, setLoading] = useState<OAuthProvider | null>(null)

  useEffect(() => {
    authApi.getMethods().then((methods) => {
      const set = new Set<OAuthProvider>()
      if (methods.oauth) {
        for (const provider of oauthProviders) {
          if (methods.oauth[provider.key]) set.add(provider.key)
        }
      }
      setEnabled(set)
    })
  }, [])

  const start = async (provider: OAuthProvider) => {
    setLoading(provider)
    try {
      const target = redirect ? safeRedirect(redirect) : '/'
      const { url } = await authApi.oauthBegin(provider, { target, email })
      window.location.href = url
    } catch (error) {
      setLoading(null)
      toast.error(getErrorMessage(error, t`Could not start sign-in`))
    }
  }

  const shown = oauthProviders.filter((provider) => enabled.has(provider.key))
  if (shown.length === 0) return null

  return (
    <div className='space-y-2'>
      {shown.map(({ key, label, Icon }) => (
        <Button
          key={key}
          type='button'
          variant='outline'
          className='w-full'
          onClick={() => start(key)}
          disabled={loading !== null}
        >
          {loading === key ? <Loader2 className='animate-spin' /> : <Icon />}
          <Trans>Continue with {label}</Trans>
        </Button>
      ))}
    </div>
  )
}
