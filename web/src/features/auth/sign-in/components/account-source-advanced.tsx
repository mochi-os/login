import { type ChangeEvent, useRef, useMemo, useState } from 'react'
import { useLingui, Trans } from '@lingui/react/macro'
import { ChevronRight } from 'lucide-react'
import { cn, Input } from '@mochi/web'
import { emailFormId } from './user-auth-form'

export type AccountSource = 'none' | 'replicate' | 'restore'

interface AccountSourceAdvancedProps {
  source: AccountSource
  onSourceChange: (value: AccountSource) => void
  // replicate fields
  replicateUsername: string
  onReplicateUsernameChange: (value: string) => void
  replicatePeer: string
  onReplicatePeerChange: (value: string) => void
  // restore fields
  restoreBundle: File | null
  onRestoreBundleChange: (value: File | null) => void
  restorePassphrase: string
  onRestorePassphraseChange: (value: string) => void
  disabled?: boolean
}

/**
 * Collapsible "Advanced" disclosure that lets the user choose where a
 * new account comes from: a fresh local signup (default), replication
 * from another running server, or restore from a backup bundle.
 */
export function AccountSourceAdvanced({
  source,
  onSourceChange,
  replicateUsername,
  onReplicateUsernameChange,
  replicatePeer,
  onReplicatePeerChange,
  restoreBundle,
  onRestoreBundleChange,
  restorePassphrase,
  onRestorePassphraseChange,
  disabled = false,
}: AccountSourceAdvancedProps) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [replicateUsernameTouched, setReplicateUsernameTouched] = useState(false)
  const [replicatePeerTouched, setReplicatePeerTouched] = useState(false)

  const usernameError = useMemo(() => {
    if (!replicateUsernameTouched) return null
    const trimmed = replicateUsername.trim()
    if (!trimmed) return null
    if (!/^[^@\s]+@[^@\s]+$/.test(trimmed)) {
      return t`Use the form alice@example.com`
    }
    return null
  }, [replicateUsername, replicateUsernameTouched, t])

  const peerError = useMemo(() => {
    if (!replicatePeerTouched) return null
    const trimmed = replicatePeer.trim()
    if (!trimmed) return null
    if (!/^12D3KooW[A-HJ-NP-Za-km-z1-9]{44}$/.test(trimmed)) {
      return t`Peer IDs start with 12D3KooW and are 52 characters long`
    }
    return null
  }, [replicatePeer, replicatePeerTouched, t])

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
          <p className='text-muted-foreground text-xs font-medium'>
            <Trans>Bring an existing account onto this server:</Trans>
          </p>

          {/* None */}
          <label className='flex items-center gap-2 cursor-pointer'>
            <input
              type='radio'
              name='account-source'
              value='none'
              checked={source === 'none'}
              onChange={() => onSourceChange('none')}
              disabled={disabled}
              className='accent-primary'
            />
            <span className='text-xs'>
              <Trans>None; create a fresh account</Trans>
            </span>
          </label>

          {/* Replicate */}
          <label className='flex items-center gap-2 cursor-pointer'>
            <input
              type='radio'
              name='account-source'
              value='replicate'
              checked={source === 'replicate'}
              onChange={() => onSourceChange('replicate')}
              disabled={disabled}
              className='accent-primary'
            />
            <span className='text-xs'>
              <Trans>Replicate from another server</Trans>
            </span>
          </label>

          {source === 'replicate' && (
            <div className='ms-5 space-y-2'>
              <p className='text-muted-foreground text-xs'>
                <Trans>
                  Your account is copied live from a server you already have access to.
                  The source server must approve the request before the transfer begins.
                </Trans>
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
                  value={replicateUsername}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onReplicateUsernameChange(e.target.value)
                  }
                  onBlur={() => setReplicateUsernameTouched(true)}
                />
                {usernameError && (
                  <p className='text-destructive mt-1 text-xs'>{usernameError}</p>
                )}
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
                  value={replicatePeer}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onReplicatePeerChange(e.target.value)
                  }
                  onBlur={() => setReplicatePeerTouched(true)}
                />
                {peerError && (
                  <p className='text-destructive mt-1 text-xs'>{peerError}</p>
                )}
              </div>
            </div>
          )}

          {/* Restore */}
          <label className='flex items-center gap-2 cursor-pointer'>
            <input
              type='radio'
              name='account-source'
              value='restore'
              checked={source === 'restore'}
              onChange={() => onSourceChange('restore')}
              disabled={disabled}
              className='accent-primary'
            />
            <span className='text-xs'>
              <Trans>Restore a backup file</Trans>
            </span>
          </label>

          {source === 'restore' && (
            <div className='ms-5 space-y-2'>
              <p className='text-muted-foreground text-xs'>
                <Trans>
                  The email you enter above becomes the new account's name on this server.
                  The backup's identity must not already be active here — restore onto a
                  different server, or delete the existing account first.
                </Trans>
              </p>
              <div>
                <label className='text-muted-foreground mb-1 block text-xs'>
                  <Trans>Backup file</Trans>
                </label>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='.zip'
                  disabled={disabled}
                  className='text-muted-foreground block w-full text-xs file:me-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium'
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0] ?? null
                    onRestoreBundleChange(file)
                  }}
                />
                {restoreBundle && (
                  <p className='text-muted-foreground mt-1 text-xs'>{restoreBundle.name}</p>
                )}
              </div>
              <div>
                <label className='text-muted-foreground mb-1 block text-xs'>
                  <Trans>Passphrase</Trans>
                </label>
                <Input
                  type='password'
                  autoComplete='current-password'
                  spellCheck={false}
                  disabled={disabled}
                  value={restorePassphrase}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onRestorePassphraseChange(e.target.value)
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
