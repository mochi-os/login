import { type ChangeEvent, useMemo, useState } from 'react'
import { useLingui, Trans } from '@lingui/react/macro'
import { ChevronRight } from 'lucide-react'
import { cn, Input } from '@mochi/web'
import { emailFormId } from './user-auth-form'

interface ReplicateAdvancedProps {
  username: string
  onUsernameChange: (value: string) => void
  peer: string
  onPeerChange: (value: string) => void
  disabled?: boolean
}

/**
 * Collapsible "Advanced" disclosure that gathers the two values needed
 * for a per-user replicate-from signup: the user's username on the
 * source server, and the source server's libp2p peer ID. Rendered
 * below the passkey/oauth login buttons by the parent so it sits at
 * the end of the auth-method priority list — most users never expand
 * it, and those who do are explicitly importing an existing account.
 *
 * Two fields rather than one combined "user@peer" string because
 * Mochi usernames are themselves email addresses (containing @), so
 * any single-field split-on-@ parsing is fragile and the placeholder
 * has nowhere good to suggest a long libp2p peer ID inline.
 */
export function ReplicateAdvanced({
  username,
  onUsernameChange,
  peer,
  onPeerChange,
  disabled = false,
}: ReplicateAdvancedProps) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  // Validation only fires once the user has blurred each field — typing
  // "a" into the username field shouldn't pop "Use the form
  // alice@example.com" before the user has had a chance to type the
  // rest. Same for the peer-ID input: "12D" is an obvious in-progress
  // value, not a malformed one.
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [peerTouched, setPeerTouched] = useState(false)

  const usernameError = useMemo(() => {
    if (!usernameTouched) return null
    const trimmed = username.trim()
    if (!trimmed) return null
    if (!/^[^@\s]+@[^@\s]+$/.test(trimmed)) {
      return t`Use the form alice@example.com`
    }
    return null
  }, [username, usernameTouched, t])

  const peerError = useMemo(() => {
    if (!peerTouched) return null
    const trimmed = peer.trim()
    if (!trimmed) return null
    if (!/^12D3KooW[A-HJ-NP-Za-km-z1-9]{44}$/.test(trimmed)) {
      return t`Peer IDs start with 12D3KooW and are 52 characters long`
    }
    return null
  }, [peer, peerTouched, t])

  return (
    <div>
      <button
        type='button'
        className='text-muted-foreground/70 hover:text-muted-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline'
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
        <Trans>Advanced</Trans>
      </button>

      {open && (
        <div className='mt-3 space-y-3'>
          <p className='text-muted-foreground text-xs'>
            <Trans>Replicate an existing account from another server</Trans>
          </p>
          <div>
            <label className='text-muted-foreground mb-1 block text-xs'>
              <Trans>Username on source server</Trans>
            </label>
            <Input
              form={emailFormId}
              name='replicate-username'
              placeholder='alice@example.com'
              autoComplete='username'
              spellCheck={false}
              disabled={disabled}
              value={username}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onUsernameChange(e.target.value)}
              onBlur={() => setUsernameTouched(true)}
            />
            {usernameError && <p className='text-destructive mt-1 text-xs'>{usernameError}</p>}
          </div>
          <div>
            <label className='text-muted-foreground mb-1 block text-xs'>
              <Trans>Source server peer ID</Trans>
            </label>
            <Input
              form={emailFormId}
              name='replicate-source-peer'
              placeholder='12D3KooW…'
              autoComplete='on'
              spellCheck={false}
              disabled={disabled}
              value={peer}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onPeerChange(e.target.value)}
              onBlur={() => setPeerTouched(true)}
            />
            {peerError && <p className='text-destructive mt-1 text-xs'>{peerError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
