import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@mochi/common'
import {
  clearProfileCookie,
  mergeProfileCookie,
  readProfileCookie,
} from '@/lib/profile-cookie'

const TOKEN_COOKIE = 'token'

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

  setAuth: (user: AuthUser | null, token: string) => void
  setUser: (user: AuthUser | null) => void
  setToken: (token: string) => void
  setLoading: (isLoading: boolean) => void
  clearAuth: () => void
  initialize: () => void
  setIdentity: (name: string, privacy: IdentityPrivacy) => void
  clearIdentity: () => void
  setMfa: (partial: string, remaining: string[]) => void
  clearMfa: () => void
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const initialToken = getCookie(TOKEN_COOKIE) || ''
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

    setAuth: (user, token) => {
      if (token) {
        setCookie(TOKEN_COOKIE, token, {
          maxAge: 60 * 60 * 24 * 365,
          path: '/',
          sameSite: 'strict',
          secure: window.location.protocol === 'https:',
        })
      }
      mergeProfileCookie({
        email: user?.email,
        name: user?.name ?? null,
      })

      set({
        user,
        token,
        isAuthenticated: Boolean(token),
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

    setToken: (token) => {
      if (token) {
        setCookie(TOKEN_COOKIE, token, {
          maxAge: 60 * 60 * 24 * 365,
          path: '/',
          sameSite: 'strict',
          secure: window.location.protocol === 'https:',
        })
      } else {
        removeCookie(TOKEN_COOKIE)
      }

      set({
        token,
        isAuthenticated: Boolean(token),
      })
    },

    setLoading: (isLoading) => {
      set({ isLoading })
    },

    clearAuth: () => {
      removeCookie(TOKEN_COOKIE, '/')
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
      const cookieToken = getCookie(TOKEN_COOKIE) || ''
      const profile = readProfileCookie()
      set({
        token: cookieToken,
        identityName: profile.name || '',
        identityPrivacy: '',
        isAuthenticated: Boolean(cookieToken),
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
