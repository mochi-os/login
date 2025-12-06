import { useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/' })
  const [step, setStep] = useState<'email' | 'verification'>('email')

  return (
    <AuthLayout>
      <Card className='gap-4'>
        {step === 'email' && (
          <CardHeader>
            <CardDescription>
              Sign in with your email address
            </CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <UserAuthForm redirectTo={redirect} step={step} setStep={setStep} />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
