import authApi, {
  type AuthUser,
  type MfaResponse,
  type RequestCodeResponse,
  type VerifyCodeResponse,
} from '@/api/auth'
import { authManager, requestHelpers } from '@mochi/common'
import { useAuthStore } from '@/stores/auth-store'

export const logout = () => authManager.logout()


// Helper to complete authentication (shared by email verify, MFA, passkey, recovery)
const completeAuth = (response: {
  token?: string
  login?: string
  name?: string
  user?: AuthUser
}) => {
  const login = response.token || ''
  const email = response.user?.email || useAuthStore.getState().user?.email
  const nameFromResponse = response.name || response.user?.name

  if (login) {
    const user: AuthUser = {
      ...(email ? { email } : {}),
      ...(nameFromResponse ? { name: nameFromResponse } : {}),
      accountNo: response.user?.accountNo,
      role: response.user?.role,
      exp: response.user?.exp,
    }

    useAuthStore.getState().setAuth(user, login)
    useAuthStore.getState().clearMfa()
    return true
  }
  return false
}

interface BeginLoginResponse {
  methods: string[]
  hasPasskey?: boolean
  new?: boolean
}

export const beginLogin = async (email: string): Promise<BeginLoginResponse> => {
  try {
    const response = await authApi.beginLogin({ email })

    const currentUser = useAuthStore.getState().user
    useAuthStore.getState().setUser({
      ...currentUser,
      email,
    })

    return response
  } catch (error) {
    console.error('Failed to begin login', error)
    throw error
  }
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
  try {
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
  } catch (error) {
    console.error('Failed to login with TOTP', error)
    throw error
  }
}

export const requestCode = async (
  email: string
): Promise<RequestCodeResponse> => {
  try {
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
  } catch (error) {
    console.error('Failed to request login code', error)
    throw error
  }
}

export const verifyCode = async (
  code: string
): Promise<VerifyCodeResponse & { success: boolean }> => {
  try {
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
  } catch (error) {
    console.error('Failed to verify login code', error)
    throw error
  }
}

export const completeMfa = async (
  method: string,
  code?: string
): Promise<MfaResponse & { success: boolean }> => {
  try {
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
  } catch (error) {
    console.error('Failed to complete MFA', error)
    throw error
  }
}

export const completeMfaMultiple = async (codes: {
  email_code?: string
  totp_code?: string
}): Promise<MfaResponse & { success: boolean }> => {
  try {
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
  } catch (error) {
    console.error('Failed to complete MFA', error)
    throw error
  }
}

export const passkeyLogin = async (): Promise<{
  success: boolean
  mfa?: boolean
  remaining?: string[]
}> => {
  try {
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
  } catch (error) {
    console.error('Failed to login with passkey', error)
    throw error
  }
}

export const recoveryLogin = async (
  username: string,
  code: string
): Promise<{ success: boolean }> => {
  try {
    const response = await authApi.recoveryLogin({ username, code })
    const success = completeAuth(response)
    return { success }
  } catch (error) {
    console.error('Failed to login with recovery code', error)
    throw error
  }
}


export const loadUserProfile = async (): Promise<AuthUser | null> => {
  try {
    const store = useAuthStore.getState()
    const { token } = store

    if (!token) {
      return null
    }

    const data = await requestHelpers.get<{
      user?: { email?: string; name?: string }
      identity?: { name?: string; privacy?: 'public' | 'private' }
    }>('/_/identity')

    const currentUser = store.user || {}
    const nextUser: AuthUser = {
      ...currentUser,
      ...(data.user?.email ? { email: data.user.email } : {}),
      ...(data.identity?.name
        ? { name: data.identity.name }
        : data.user?.name
          ? { name: data.user.name }
          : {}),
    }
    store.setUser(nextUser)

    if (data.identity?.name && data.identity.privacy) {
      store.setIdentity(data.identity.name, data.identity.privacy)
    } else {
      store.clearIdentity()
    }

    return nextUser
  } catch (error) {
    console.error('Failed to load user profile', error)
    return null
  }
}

type IdentityPayload = {
  name: string
  privacy: 'public' | 'private'
}

export const submitIdentity = async ({
  name,
  privacy,
}: IdentityPayload): Promise<void> => {
  try {
    const response = await fetch(`${window.location.origin}/_/identity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name, privacy }),
    })

    if (!response.ok) {
      throw new Error(`Identity request failed with status ${response.status}`)
    }

    useAuthStore.getState().setIdentity(name, privacy)
  } catch (error) {
    console.error('Failed to submit identity', error)
    throw error
  }
}

export type { AuthUser, RequestCodeResponse, VerifyCodeResponse }
