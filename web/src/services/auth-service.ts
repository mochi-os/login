// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { msg } from '@lingui/core/macro'
import { i18n } from '@lingui/core'
import axios, { type AxiosProgressEvent } from 'axios'
import { authApi,
  type AuthUser,
  type BeginLoginResponse,
  type MfaRequest,
  type MfaResponse,
  type RequestCodeResponse,
  type TotpLoginResponse,
  type VerifyCodeResponse,
} from '@/api/auth'
import endpoints from '@/api/endpoints'
import { requestHelpers, LANGUAGE_STORAGE_KEY } from '@mochi/web'
import { useAuthStore } from '@/stores/auth-store'

// Complete authentication (email verify, MFA, passkey, recovery). The server
// sets the session cookie; app tokens are injected into HTML at page load, not
// returned here. Failure never reaches this point: the server refuses with an
// HTTP error, which throws in the caller. The body also carries has_identity,
// but the store derives hasIdentity from name, which the server sends exactly
// when an identity exists, so nothing here reads the flag.
const completeAuth = (response: { name?: string }): void => {
  const email = useAuthStore.getState().user?.email
  const user: AuthUser = {
    ...(email ? { email } : {}),
    ...(response.name ? { name: response.name } : {}),
  }

  useAuthStore.getState().setAuth(user)
  useAuthStore.getState().clearMfa()
}

// Ask the server whether the cookie session is live and sync the store. Returns
// null for anonymous or on failure, and never clears the store: a 401 is normal
// for anonymous and mid-MFA visitors.
export const resolveSession = async (): Promise<{
  closing: boolean
  hasIdentity: boolean
} | null> => {
  const store = useAuthStore.getState()
  let data: {
    user?: { email?: string; name?: string; status?: string }
    identity?: { name?: string; privacy?: 'public' | 'private' }
  }
  try {
    data = await requestHelpers.get('/_/identity')
  } catch {
    return null
  }

  const name = data.identity?.name || data.user?.name
  store.setAuth({
    ...(store.user || {}),
    ...(data.user?.email ? { email: data.user.email } : {}),
    ...(name ? { name } : {}),
  })
  if (data.identity?.name) {
    store.setIdentity(data.identity.name)
  } else {
    store.clearIdentity()
  }

  return {
    closing: data.user?.status === 'closing',
    hasIdentity: Boolean(name),
  }
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

export const totpLogin = async (
  email: string,
  code: string
): Promise<TotpLoginResponse> => {
  const response = await authApi.totpLogin({ email, code })

  // Check for MFA requirement
  if (response.mfa && response.partial && response.remaining) {
    useAuthStore.getState().setMfa(response.partial, response.remaining)
    return response
  }

  completeAuth(response)
  return response
}

export const requestCode = async (
  email: string
): Promise<RequestCodeResponse> => {
  const response = await authApi.requestCode({ email })

  if (response.status?.toLowerCase() !== 'ok') {
    throw new Error(response.message || i18n._(msg`Failed to request login code`))
  }

  const currentUser = useAuthStore.getState().user
  useAuthStore.getState().setUser({
    ...currentUser,
    email,
  })

  return response
}


export const signupRestore = async (
  email: string,
  passphrase: string,
  bundle: File,
  code: string,
  onProgress?: (event: AxiosProgressEvent) => void,
): Promise<{ status: string; uid: string }> => {
  const form = new FormData()
  form.append('email', email)
  form.append('passphrase', passphrase)
  // The emailed code proves the address is the caller's. The passphrase only
  // proves the bundle is theirs, which is a different claim. Ordered before the
  // bundle deliberately: the server reads the parts in order and refuses to
  // spool a bundle it cannot yet attribute to a proven address.
  form.append('code', code)
  form.append('bundle', bundle)
  // Plain axios rather than fetch so onUploadProgress can report byte progress
  // on the bundle upload; errors keep the {response: {data}} shape the caller
  // reads. No timeout — bundles can be large.
  const response = await axios.post<{ status: string; uid: string }>(
    endpoints.auth.restore,
    form,
    { timeout: 0, onUploadProgress: onProgress },
  )
  useAuthStore.getState().setUser({ email })
  return response.data
}

export const verifyCode = async (
  code: string
): Promise<VerifyCodeResponse> => {
  const response = await authApi.verifyCode({ code })

  // Check for MFA requirement
  if (response.mfa && response.partial && response.remaining) {
    useAuthStore.getState().setMfa(response.partial, response.remaining)
    return response
  }

  completeAuth(response)
  return response
}

// One factor or several in one submission: the continuation is the same either
// way, so only the payload differs.
const submitMfa = async (
  factors: Omit<MfaRequest, 'partial'>
): Promise<MfaResponse> => {
  const { mfa } = useAuthStore.getState()
  if (!mfa.partial) {
    throw new Error(i18n._(msg`No MFA session`))
  }

  const response = await authApi.completeMfa({
    partial: mfa.partial,
    ...factors,
  })

  // Check if more MFA is required
  if (response.mfa && response.partial && response.remaining) {
    useAuthStore.getState().setMfa(response.partial, response.remaining)
    return response
  }

  completeAuth(response)
  return response
}

export const completeMfa = (
  method: string,
  code?: string
): Promise<MfaResponse> => submitMfa({ method, code })

export const completeMfaMultiple = (codes: {
  email_code?: string
  totp_code?: string
}): Promise<MfaResponse> => submitMfa(codes)

export const passkeyLogin = async (): Promise<{
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
    return { mfa: true, remaining: response.remaining }
  }

  completeAuth(response)
  return {}
}

export const recoveryLogin = async (
  username: string,
  code: string
): Promise<void> => {
  const response = await authApi.recoveryLogin({ username, code })
  completeAuth(response)
}


type IdentityPayload = {
  name: string
  privacy: 'public' | 'private'
}

const pickedLanguage = (): string => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && stored.toLowerCase() !== 'auto') return stored
  } catch {
    /* sandboxed / no storage — nothing to send */
  }
  return ''
}

export const submitIdentity = async ({
  name,
  privacy,
}: IdentityPayload): Promise<void> => {
  const language = pickedLanguage()
  await requestHelpers.post(endpoints.auth.identity, {
    name,
    privacy,
    ...(language ? { language } : {}),
  })
  useAuthStore.getState().setIdentity(name)
}

export const abandonSignup = async (): Promise<void> => {
  await requestHelpers.post(endpoints.auth.abandon, {})
  useAuthStore.getState().clearAuth()
}
