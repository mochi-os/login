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
        <div className='mb-4 flex items-center justify-center'>
          <img
            src='/login/images/logo-vertical.svg'
            alt='Mochi'
            className='h-48'
          />
        </div>
        {children}
      </div>
    </div>
  )
}
