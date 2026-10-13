// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

export interface AuthUser {
  email?: string
  name?: string
}

export interface RequestCodeRequest {
  email: string
}

export interface RequestCodeResponse {
  status: string
  message?: string
}

export interface VerifyCodeRequest {
  code: string
}

export interface VerifyCodeResponse {
  // No success field: /_/auth/verify answers with either the MFA object or a
  // completed login; a refusal is an HTTP error, which throws in the caller.
  user?: AuthUser
  name?: string
  message?: string
  // MFA fields
  mfa?: boolean
  partial?: string
  remaining?: string[]
}

export type OAuthProvider =
  | 'bluesky'
  | 'facebook'
  | 'github'
  | 'google'
  | 'mastodon'
  | 'microsoft'
  | 'x'

interface OAuthProvidersEnabled {
  bluesky?: boolean
  facebook: boolean
  github: boolean
  google: boolean
  mastodon?: boolean
  microsoft: boolean
  x: boolean
}

export interface AuthMethodsResponse {
  email: boolean
  passkey: boolean
  recovery: boolean
  signup: boolean
  oauth?: OAuthProvidersEnabled
}

export interface OAuthBeginRequest {
  target?: string
  link?: boolean
  // Set on the email-login verification step: binds the OAuth sign-in to the
  // typed account so the callback rejects a different one.
  email?: string
  // A Mastodon sign-in names the account's server; a Bluesky one its handle.
  server?: string
  handle?: string
}

export interface OAuthBeginResponse {
  url: string
}

// MFA types
export interface MfaRequest {
  partial: string
  method?: string
  code?: string
  email_code?: string
  totp_code?: string
}

export interface MfaResponse {
  name?: string
  mfa?: boolean
  partial?: string
  remaining?: string[]
}

// Passkey login (unauthenticated)
export interface PasskeyLoginBeginResponse {
  // Using unknown since the exact type from @simplewebauthn/browser has strict requirements
  options: unknown
  ceremony: string
}

export interface PasskeyLoginFinishResponse {
  name?: string
  mfa?: boolean
  partial?: string
  remaining?: string[]
}

// Recovery login
export interface RecoveryLoginRequest {
  username: string
  code: string
}

export interface RecoveryLoginResponse {
  name?: string
}
