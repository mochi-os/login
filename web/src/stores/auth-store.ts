// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { create } from 'zustand'
import { type AuthUser } from '@/api/types/auth'
import {
  clearProfileCookie,
  mergeProfileCookie,
  readProfileCookie,
} from '@/lib/profile-cookie'

export interface MfaState {
  required: boolean
  partial: string
  remaining: string[]
}

interface AuthState {
  user: AuthUser | null
  isInitialized: boolean
  hasIdentity: boolean
  mfa: MfaState

  setAuth: (user: AuthUser | null) => void
  setUser: (user: AuthUser | null) => void
  clearAuth: () => void
  initialize: () => void
  setIdentity: (name: string) => void
  clearIdentity: () => void
  setMfa: (partial: string, remaining: string[]) => void
  clearMfa: () => void
}

export const useAuthStore = create<AuthState>()((set) => {
  const initialProfile = readProfileCookie()

  return {
    user: null,
    isInitialized: false,
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
        hasIdentity: Boolean(user?.name),
        isInitialized: true,
      })
    },

    // Profile data only — authentication is a cookie session the client
    // cannot see, so setUser never changes isAuthenticated (use setAuth
    // after the server has confirmed the session). clearAuth is reserved
    // for explicit paths — logout, ?reauth, abandonSignup — never for a
    // mere 401, which is the normal answer for anonymous visitors.
    setUser: (user) => {
      mergeProfileCookie({
        email: user?.email,
        name: user?.name,
      })
      set({ user })
    },

    clearAuth: () => {
      clearProfileCookie()

      set({
        user: null,
        hasIdentity: false,
        isInitialized: true,
        mfa: { required: false, partial: '', remaining: [] },
      })
    },

    initialize: () => {
      const profile = readProfileCookie()
      set({
        // The cookie is the only login state that survives a page load, so
        // user is restored from it too — the recovery and MFA pages read the
        // email after a mid-flow reload, when memory is gone but the cookie
        // is not.
        user:
          profile.email || profile.name
            ? {
                ...(profile.email ? { email: profile.email } : {}),
                ...(profile.name ? { name: profile.name } : {}),
              }
            : null,
        hasIdentity: Boolean(profile.name),
        isInitialized: true,
      })
    },

    setIdentity: (name) => {
      mergeProfileCookie({
        name,
      })
      set({
        hasIdentity: Boolean(name),
      })
    },

    clearIdentity: () => {
      // Clearing identity state must NOT wipe the profile cookie: the cookie
      // is the OAuth-provided prefill that seeds /login/identity. It is only
      // removed when the user explicitly logs out (clearAuth).
      set({
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
