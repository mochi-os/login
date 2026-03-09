import { create } from 'zustand'
import { getAppToken } from '@mochi/common'
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
  const initialToken = getAppToken()
  const initialProfile = readProfileCookie()

  return {
    user: null,
    token: initialToken,
    isLoading: false,
    isInitialized: false,
    identityName: initialProfile.name || '',
    identityPrivacy: '',
    isAuthenticated: Boolean(initialToken),
    hasIdentity: Boolean(initialProfile.name),
    mfa: { required: false, partial: '', remaining: [] },

    setAuth: (user) => {
      mergeProfileCookie({
        email: user?.email,
        name: user?.name ?? null,
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
      const metaToken = getAppToken()
      const profile = readProfileCookie()
      set({
        token: metaToken,
        identityName: profile.name || '',
        identityPrivacy: '',
        isAuthenticated: Boolean(metaToken),
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
      mergeProfileCookie({
        name: null,
      })
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
