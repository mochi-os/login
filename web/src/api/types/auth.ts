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
  data?: {
    code?: string
  }
}

export interface SignupRequest {
  email: string
}

export interface SignupResponse {
  success: boolean
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

export interface AuthMethodsResponse {
  email: boolean
  passkey: boolean
  recovery: boolean
  signup: boolean
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  token: string
  refreshToken?: string
  login?: string
  user?: AuthUser
  expiresIn?: number
  expires_in?: number
}

export interface MeResponse {
  user: AuthUser
}

// MFA types
export interface MfaRequest {
  partial: string
  method: string
  code?: string
}

export interface MfaResponse {
  token?: string
  login?: string
  name?: string
  mfa?: boolean
  partial?: string
  remaining?: string[]
}

// Passkey types
export interface PasskeyCredential {
  id: string
  name: string
  transports: string
  created: number
  last_used: number
}

export interface PasskeyListResponse {
  credentials: PasskeyCredential[]
}

export interface PasskeyCountResponse {
  count: number
}

export interface PasskeyRegisterBeginResponse {
  // Using unknown since the exact type from @simplewebauthn/browser has strict requirements
  options: unknown
  ceremony: string
}

export interface PasskeyRegisterFinishRequest {
  ceremony: string
  credential: unknown
  name?: string
}

export interface PasskeyRegisterFinishResponse {
  status: string
  name: string
}

export interface PasskeyLoginBeginResponse {
  // Using unknown since the exact type from @simplewebauthn/browser has strict requirements
  options: unknown
  ceremony: string
}

export interface PasskeyLoginFinishRequest {
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

export interface PasskeyRenameRequest {
  id: string
  name: string
}

export interface PasskeyDeleteRequest {
  id: string
}

// TOTP types
export interface TotpSetupResponse {
  secret: string
  url: string
  issuer: string
  domain: string
}

export interface TotpVerifyRequest {
  code: string
}

export interface TotpVerifyResponse {
  ok: boolean
}

export interface TotpEnabledResponse {
  enabled: boolean
}

// Recovery types
export interface RecoveryGenerateResponse {
  codes: string[]
}

export interface RecoveryCountResponse {
  count: number
}

export interface RecoveryLoginRequest {
  username: string
  code: string
}

export interface RecoveryLoginResponse {
  token?: string
  login?: string
  name?: string
}

// Methods types
export interface MethodsGetResponse {
  methods: string[]
}

export interface MethodsSetRequest {
  methods: string[]
}
