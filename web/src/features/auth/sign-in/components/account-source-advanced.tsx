// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { type ChangeEvent, useRef, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { ChevronRight } from 'lucide-react'
import { cn, Input } from '@mochi/web'

export type AccountSource = 'none' | 'restore'

interface AccountSourceAdvancedProps {
  source: AccountSource
  onSourceChange: (value: AccountSource) => void
  // restore fields
  restoreBundle: File | null
  onRestoreBundleChange: (value: File | null) => void
  restorePassphrase: string
  onRestorePassphraseChange: (value: string) => void
  disabled?: boolean
}

/**
 * Collapsible "Advanced" disclosure that lets the user choose where a
 * new account comes from: a fresh local signup (default) or restore
 * from a backup bundle.
 */
export function AccountSourceAdvanced({
  source,
  onSourceChange,
  restoreBundle,
  onRestoreBundleChange,
  restorePassphrase,
  onRestorePassphraseChange,
  disabled = false,
}: AccountSourceAdvancedProps) {
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
