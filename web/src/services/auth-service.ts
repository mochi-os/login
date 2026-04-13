import { authApi,
  type AuthUser,
  type MfaResponse,
  type RequestCodeResponse,
  type VerifyCodeResponse,
} from '@/api/auth'
import endpoints from '@/api/endpoints'
import { requestHelpers } from '@mochi/web'
import { useAuthStore } from '@/stores/auth-store'

// Helper to complete authentication (shared by email verify, MFA, passkey, recovery).
// The server sets the session cookie and returns {name, has_identity}.
// No JWT token is returned — app-scoped tokens are injected into HTML on page load.
const completeAuth = (response: {
  name?: string
  has_identity?: boolean
}) => {
  const email = useAuthStore.getState().user?.email
  const user: AuthUser = {
    ...(email ? { email } : {}),
    ...(response.name ? { name: response.name } : {}),
  }

  useAuthStore.getState().setAuth(user)
  useAuthStore.getState().clearMfa()
  return true
}

interface BeginLoginResponse {
  methods: string[]
  hasPasskey?: boolean
  new?: boolean
}

export const beginLogin = async (email: string): Promise<BeginLoginResponse> => {
  const response = await authApi.beginLogin({ email })

  const currentUser = useAuthStore.getState().user
  useAuthStore.getState().setUser({
    ...currentUser,
    email,
  })

  return response
}

interface TotpLoginResponse {
  token?: string
  login?: string
  name?: string
  mfa?: boolean
  partial?: string
  remaining?: string[]
}

export const totpLogin = async (
  email: string,
  code: string
): Promise<TotpLoginResponse & { success: boolean }> => {
  const response = await authApi.totpLogin({ email, code })

  // Check for MFA requirement
  if (response.mfa && response.partial && response.remaining) {
    useAuthStore.getState().setMfa(response.partial, response.remaining)
    return {
      ...response,
      success: true,
    }
  }

  const success = completeAuth(response)

  return {
    ...response,
    success,
  }
}

export const requestCode = async (
  email: string
): Promise<RequestCodeResponse> => {
  const response = await authApi.requestCode({ email })

  const responseStatus = response.status?.toLowerCase()
  const devCode = response.data?.code
  const isSuccess = responseStatus === 'ok' || Boolean(devCode)

  if (!isSuccess) {
    throw new Error(response.message || 'Failed to request login code')
  }

  const currentUser = useAuthStore.getState().user
  useAuthStore.getState().setUser({
    ...currentUser,
    email,
  })

  return response
}

export const verifyCode = async (
  code: string
): Promise<VerifyCodeResponse & { success: boolean }> => {
  const response = await authApi.verifyCode({ code })

  // Check for MFA requirement
  if (response.mfa && response.partial && response.remaining) {
    useAuthStore.getState().setMfa(response.partial, response.remaining)
    return {
      ...response,
      success: true, // Partial success - MFA required
    }
  }

  const success = completeAuth(response)

  return {
    ...response,
    success,
  }
}

export const completeMfa = async (
  method: string,
  code?: string
): Promise<MfaResponse & { success: boolean }> => {
  const { mfa } = useAuthStore.getState()
  if (!mfa.partial) {
    throw new Error('No MFA session')
  }

  const response = await authApi.completeMfa({
    partial: mfa.partial,
    method,
    code,
  })

  // Check if more MFA is required
  if (response.mfa && response.partial && response.remaining) {
    useAuthStore.getState().setMfa(response.partial, response.remaining)
    return {
      ...response,
      success: true, // Partial success - more MFA required
    }
  }

  const success = completeAuth(response)

  return {
    ...response,
    success,
  }
}

export const completeMfaMultiple = async (codes: {
  email_code?: string
  totp_code?: string
}): Promise<MfaResponse & { success: boolean }> => {
  const { mfa } = useAuthStore.getState()
  if (!mfa.partial) {
    throw new Error('No MFA session')
  }

  const response = await authApi.completeMfa({
    partial: mfa.partial,
    ...codes,
  })

  // Check if more MFA is required
  if (response.mfa && response.partial && response.remaining) {
    useAuthStore.getState().setMfa(response.partial, response.remaining)
    return {
      ...response,
      success: true, // Partial success - more MFA required
    }
  }

  const success = completeAuth(response)

  return {
    ...response,
    success,
  }
}

export const passkeyLogin = async (): Promise<{
  success: boolean
  mfa?: boolean
  remaining?: string[]
}> => {
  const { startAuthentication } = await import('@simplewebauthn/browser')

  // Begin passkey login
  const beginResponse = await authApi.passkeyLoginBegin()

  // Perform WebAuthn ceremony
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credential = await startAuthentication({ optionsJSON: beginResponse.options as any })

  // Finish passkey login
  const response = await authApi.passkeyLoginFinish(
    beginResponse.ceremony,
    credential
  )

  // Check for MFA requirement
  if (response.mfa && response.partial && response.remaining) {
    useAuthStore.getState().setMfa(response.partial, response.remaining)
    return {
      success: true,
      mfa: true,
      remaining: response.remaining,
    }
  }

  const success = completeAuth(response)

  return { success }
}

export const recoveryLogin = async (
  username: string,
  code: string
): Promise<{ success: boolean }> => {
  const response = await authApi.recoveryLogin({ username, code })
  const success = completeAuth(response)
  return { success }
}


type IdentityPayload = {
  name: string
  privacy: 'public' | 'private'
}

export const submitIdentity = async ({
  name,
  privacy,
}: IdentityPayload): Promise<void> => {
  await requestHelpers.post(endpoints.auth.identity, { name, privacy })
  useAuthStore.getState().setIdentity(name, privacy)
}

export const abandonSignup = async (): Promise<void> => {
  await requestHelpers.post(endpoints.auth.abandon, {})
  useAuthStore.getState().clearAuth()
}

export type { AuthUser, RequestCodeResponse, VerifyCodeResponse }
