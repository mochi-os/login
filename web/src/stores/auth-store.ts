import { create } from 'zustand'
import {
  clearProfileCookie,
  mergeProfileCookie,
  readProfileCookie,
} from '@/lib/profile-cookie'

export type IdentityPrivacy = 'public' | 'private'

export interface AuthUser {
  email?: string
  name?: string
}

export interface MfaState {
  required: boolean
  partial: string
  remaining: string[]
}

interface AuthState {
  user: AuthUser | null
  token: string
  isLoading: boolean
  isInitialized: boolean
  identityName: string
  identityPrivacy: IdentityPrivacy | ''
  isAuthenticated: boolean
  hasIdentity: boolean
  mfa: MfaState

  setAuth: (user: AuthUser | null) => void
  setUser: (user: AuthUser | null) => void
  clearAuth: () => void
  initialize: () => void
  setIdentity: (name: string, privacy: IdentityPrivacy) => void
  clearIdentity: () => void
  setMfa: (partial: string, remaining: string[]) => void
  clearMfa: () => void
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const initialProfile = readProfileCookie()

  return {
    user: null,
    token: '',
    isLoading: false,
    isInitialized: false,
    identityName: initialProfile.name || '',
    identityPrivacy: '',
    isAuthenticated: false,
    hasIdentity: Boolean(initialProfile.name),
    mfa: { required: false, partial: '', remaining: [] },

    setAuth: (user) => {
      // Only update cookie fields that were actually supplied. Passing
      // null would delete the field — we must not erase the OAuth-seeded
      // name just because the server's /_/identity response omitted it.
      mergeProfileCookie({
        email: user?.email,
        name: user?.name,
      })

      set({
        user,
        token: '',
        isAuthenticated: true,
        identityName: user?.name || '',
        hasIdentity: Boolean(user?.name),
        isInitialized: true,
      })
    },

    setUser: (user) => {
      mergeProfileCookie({
        email: user?.email,
        name: user?.name,
      })
      set({
        user,
        isAuthenticated: Boolean(get().token),
      })
    },

    clearAuth: () => {
      clearProfileCookie()

      set({
        user: null,
        token: '',
        identityName: '',
        identityPrivacy: '',
        isAuthenticated: false,
        hasIdentity: false,
        isLoading: false,
        isInitialized: true,
        mfa: { required: false, partial: '', remaining: [] },
      })
    },

    initialize: () => {
      const profile = readProfileCookie()
      set({
        identityName: profile.name || '',
        identityPrivacy: '',
        hasIdentity: Boolean(profile.name),
        isInitialized: true,
      })
    },

    setIdentity: (name, privacy) => {
      mergeProfileCookie({
        name,
      })
      set({
        identityName: name,
        identityPrivacy: privacy,
        hasIdentity: Boolean(name),
      })
    },

    clearIdentity: () => {
      // Clearing identity state must NOT wipe the profile cookie: the cookie
      // is the OAuth-provided prefill that seeds /login/identity. It is only
      // removed when the user explicitly logs out (clearAuth).
      set({
        identityName: '',
        identityPrivacy: '',
        hasIdentity: false,
      })
    },

    setMfa: (partial, remaining) => {
      set({
        mfa: { required: true, partial, remaining },
      })
    },

    clearMfa: () => {
      set({
        mfa: { required: false, partial: '', remaining: [] },
      })
    },
  }
})
