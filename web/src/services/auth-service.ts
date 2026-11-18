// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import {
  createHttpClient,
  requestHelpers,
  LANGUAGE_STORAGE_KEY,
  type TransferProgress,
} from '@mochi/web'
import {
  authApi,
  methodsQuery,
  type AuthUser,
  type BeginLoginResponse,
  type MfaRequest,
  type MfaResponse,
  type RequestCodeResponse,
  type TotpLoginResponse,
  type VerifyCodeResponse,
} from '@/api/auth'
import endpoints from '@/api/endpoints'
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

type Identity = {
  user?: { email?: string; name?: string; status?: string }
  identity?: { name?: string; privacy?: 'public' | 'private' }
}

type Session = { closing: boolean; hasIdentity: boolean } | null

// Who the server says the cookie session belongs to; null for anonymous or on
// failure.
const askIdentity = async (): Promise<Identity | null> => {
  try {
    return await requestHelpers.get<Identity>('/_/identity')
  } catch {
    return null
  }
}

// Sync the store from the server's answer. Never clears it: a 401 is normal
// for anonymous and mid-MFA visitors.
const applySession = (data: Identity | null): Session => {
  if (!data) return null
  const store = useAuthStore.getState()
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

// Ask the server whether the cookie session is live and sync the store. Returns
// null for anonymous or on failure.
export const resolveSession = async (): Promise<Session> =>
  applySession(await askIdentity())

// The sign-in page's session check, asked as the page's script loads rather
// than once the language catalogue has. Only the request starts early: its
// answer reaches the store when the index route takes it, after that route's
// reauth check, because a visitor sent back to sign in has their state
// cleared, and an answer applied before the clear signs them straight back in.
let early: { asked: number; answer: Promise<Identity | null> } | null = null

// How long the early answer stands. One taken later - behind a slow catalogue,
// or on a page restored from the back-forward cache - may describe a session
// signed out or changed in another tab since, so the route asks again.
const EARLY_LIFETIME = 5_000

// The sign-in page's first requests, started with its script (main.tsx): the
// router renders inside I18nProvider, which holds everything until the
// language catalogue has loaded, so the index route's beforeLoad, and all it
// asks for, waited on the catalogue. The sign-in methods, the page's code and
// the session check; the last not for an address asking for reauth.
export const prefetchSignIn = (
  router: AnyRouter,
  queryClient: QueryClient
): void => {
  const opening = router.state.location
  const { matchedRoutes, foundRoute } = router.getMatchedRoutes(
    opening.pathname
  )
  if (foundRoute?.id !== '/') return
  void queryClient.prefetchQuery(methodsQuery)
  for (const route of matchedRoutes) {
    // undefined, not a promise, when a route has nothing left to load
    Promise.resolve(router.loadRouteChunk(route)).catch(() => {})
  }
  if ('reauth' in opening.search) return
  early ??= { asked: Date.now(), answer: askIdentity() }
}

// The early answer once, while it is fresh, then a fresh check each time after.
export const takeSession = async (): Promise<Session> => {
  const held = early
  early = null
  const pending =
    held && Date.now() - held.asked <= EARLY_LIFETIME
      ? held.answer
      : askIdentity()
  return applySession(await pending)
}

// Drop an early answer unapplied.
export const discardSession = (): void => {
  early = null
}

export const beginLogin = async (
  email: string
): Promise<BeginLoginResponse> => {
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
    throw new Error(
      response.message || i18n._(msg`Failed to request login code`)
    )
  }

  const currentUser = useAuthStore.getState().user
  useAuthStore.getState().setUser({
    ...currentUser,
    email,
  })

  return response
}

// Asks for JSON, as the old client did by default: without application/json
// the server answers an error as an HTML page, and the caller could not read
// its reason.
const restoreClient = createHttpClient({
  defaults: { headers: { Accept: 'application/json, text/plain, */*' } },
})

export const signupRestore = async (
  email: string,
  passphrase: string,
  bundle: File,
  code: string,
  onProgress?: (event: TransferProgress) => void
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
  // A bare client rather than requestHelpers: no
  // token, toasts or envelope handling, and errors keep the {response: {data}}
  // shape the caller reads. onUploadProgress reports byte progress on the
  // bundle upload. No timeout — bundles can be large.
  const response = await restoreClient.post<{ status: string; uid: string }>(
    endpoints.auth.restore,
    form,
    { timeout: 0, onUploadProgress: onProgress }
  )
  useAuthStore.getState().setUser({ email })
  return response.data
}

export const verifyCode = async (code: string): Promise<VerifyCodeResponse> => {
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
  // The library and the challenge are asked for together: neither needs the
  // other, and the challenge is the slower of the two.
  const [{ startAuthentication }, beginResponse] = await Promise.all([
    import('@simplewebauthn/browser'),
    authApi.passkeyLoginBegin(),
  ])

  // Perform WebAuthn ceremony
  const credential = await startAuthentication({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    optionsJSON: beginResponse.options as any,
  })

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
