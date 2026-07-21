// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

export interface AuthUser {
  email?: string
  name?: string
  accountNo?: string
  role?: string[]
  exp?: number
  avatar?: string
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
  success: boolean
  token?: string
  login?: string
  user?: AuthUser
  name?: string
  message?: string
  expiresIn?: number
  expires_in?: number
  // MFA fields
  mfa?: boolean
  partial?: string
  remaining?: string[]
}

export type OAuthProvider =
  | 'facebook'
  | 'github'
  | 'google'
  | 'microsoft'
  | 'x'

export interface OAuthProvidersEnabled {
  facebook: boolean
  github: boolean
  google: boolean
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
  token?: string
  login?: string
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
  token?: string
  login?: string
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
  token?: string
  login?: string
  name?: string
}
