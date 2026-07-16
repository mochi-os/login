// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { LanguagePicker } from '@mochi/web'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='container grid h-svh max-w-none items-center justify-center'>
      {/* Language picker in the top-right so non-English speakers can switch
          before authenticating. Auto-hides when only English is installed. */}
      <div className='absolute top-4 right-4'>
        <LanguagePicker />
      </div>
      <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-[480px] sm:p-8'>
        <div className='mb-4 flex flex-col items-center justify-center gap-2'>
          <img
            src='/login/images/logo-header.png'
            alt='Mochi'
            className='h-24 w-24 sm:h-32 sm:w-32'
          />
          <span className='text-3xl font-light tracking-[0.2em] text-foreground/80'>
            mochi
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
