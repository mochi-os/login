import endpoints from '@/api/endpoints'
import {
  type AuthMethodsResponse,
  type AuthUser,
  type MfaRequest,
  type MfaResponse,
  type MethodsGetResponse,
  type MethodsSetRequest,
  type PasskeyCountResponse,
  type PasskeyDeleteRequest,
  type PasskeyListResponse,
  type PasskeyLoginBeginResponse,
  type PasskeyLoginFinishResponse,
  type PasskeyRegisterBeginResponse,
  type PasskeyRegisterFinishRequest,
  type PasskeyRegisterFinishResponse,
  type PasskeyRenameRequest,
  type RecoveryCountResponse,
  type RecoveryGenerateResponse,
  type RecoveryLoginRequest,
  type RecoveryLoginResponse,
  type RequestCodeRequest,
  type RequestCodeResponse,
  type TotpEnabledResponse,
  type TotpSetupResponse,
  type TotpVerifyRequest,
  type TotpVerifyResponse,
  type VerifyCodeRequest,
  type VerifyCodeResponse,
} from '@/api/types/auth'
import { requestHelpers } from '@mochi/common'

// Login flow
interface BeginLoginRequest {
  email: string
}

interface BeginLoginResponse {
  methods: string[]
  hasPasskey?: boolean
  new?: boolean
}

interface TotpLoginRequest {
  email: string
  code: string
}

interface TotpLoginResponse {
  token?: string
  login?: string
  name?: string
  mfa?: boolean
  partial?: string
  remaining?: string[]
}

const beginLogin = (payload: BeginLoginRequest) =>
  requestHelpers.post<BeginLoginResponse>(endpoints.auth.begin, payload)

const totpLogin = (payload: TotpLoginRequest) =>
  requestHelpers.post<TotpLoginResponse>(endpoints.auth.totpLogin, payload)

// Email auth
const requestCode = (payload: RequestCodeRequest) =>
  requestHelpers.post<RequestCodeResponse>(endpoints.auth.code, payload)

const verifyCode = (payload: VerifyCodeRequest) =>
  requestHelpers.post<VerifyCodeResponse>(endpoints.auth.verify, payload)

const getMethods = () =>
  requestHelpers.get<AuthMethodsResponse>(endpoints.auth.methods)

// MFA
const completeMfa = (payload: MfaRequest) =>
  requestHelpers.post<MfaResponse>(endpoints.auth.methods, payload)

// Passkey login (unauthenticated)
const passkeyLoginBegin = () =>
  requestHelpers.post<PasskeyLoginBeginResponse>(
    endpoints.auth.passkey.loginBegin,
    {}
  )

const passkeyLoginFinish = (ceremony: string, credential: unknown) =>
  requestHelpers.post<PasskeyLoginFinishResponse>(
    endpoints.auth.passkey.loginFinish,
    { ceremony, ...(credential as object) }
  )

// Passkey management (authenticated)
const passkeyList = () =>
  requestHelpers.get<PasskeyListResponse>(endpoints.auth.passkey.list)

const passkeyCount = () =>
  requestHelpers.get<PasskeyCountResponse>(endpoints.auth.passkey.count)

const passkeyRegisterBegin = () =>
  requestHelpers.post<PasskeyRegisterBeginResponse>(
    endpoints.auth.passkey.registerBegin,
    {}
  )

const passkeyRegisterFinish = (payload: PasskeyRegisterFinishRequest) =>
  requestHelpers.post<PasskeyRegisterFinishResponse>(
    endpoints.auth.passkey.registerFinish,
    payload
  )

const passkeyRename = (payload: PasskeyRenameRequest) =>
  requestHelpers.post<{ ok: boolean }>(endpoints.auth.passkey.rename, payload)

const passkeyDelete = (payload: PasskeyDeleteRequest) =>
  requestHelpers.post<{ ok: boolean }>(endpoints.auth.passkey.delete, payload)

// TOTP (authenticated)
const totpSetup = () =>
  requestHelpers.post<TotpSetupResponse>(endpoints.auth.totp.setup, {})

const totpVerify = (payload: TotpVerifyRequest) =>
  requestHelpers.post<TotpVerifyResponse>(endpoints.auth.totp.verify, payload)

const totpEnabled = () =>
  requestHelpers.get<TotpEnabledResponse>(endpoints.auth.totp.enabled)

const totpDisable = () =>
  requestHelpers.post<{ ok: boolean }>(endpoints.auth.totp.disable, {})

// Recovery codes
const recoveryLogin = (payload: RecoveryLoginRequest) =>
  requestHelpers.post<RecoveryLoginResponse>(
    endpoints.auth.recovery.login,
    payload
  )

const recoveryGenerate = () =>
  requestHelpers.post<RecoveryGenerateResponse>(
    endpoints.auth.recovery.generate,
    {}
  )

const recoveryCount = () =>
  requestHelpers.get<RecoveryCountResponse>(endpoints.auth.recovery.count)

// User methods (authenticated)
const userMethodsGet = () =>
  requestHelpers.get<MethodsGetResponse>(endpoints.auth.userMethods.get)

const userMethodsSet = (payload: MethodsSetRequest) =>
  requestHelpers.post<{ ok: boolean }>(endpoints.auth.userMethods.set, payload)

export const authApi = {
  // Login flow
  beginLogin,
  totpLogin,
  // Email auth
  requestCode,
  verifyCode,
  getMethods,
  // MFA
  completeMfa,
  // Passkey
  passkeyLoginBegin,
  passkeyLoginFinish,
  passkeyList,
  passkeyCount,
  passkeyRegisterBegin,
  passkeyRegisterFinish,
  passkeyRename,
  passkeyDelete,
  // TOTP
  totpSetup,
  totpVerify,
  totpEnabled,
  totpDisable,
  // Recovery
  recoveryLogin,
  recoveryGenerate,
  recoveryCount,
  // User methods
  userMethodsGet,
  userMethodsSet,
}

export type {
  AuthMethodsResponse,
  AuthUser,
  MfaRequest,
  MfaResponse,
  MethodsGetResponse,
  MethodsSetRequest,
  PasskeyCountResponse,
  PasskeyDeleteRequest,
  PasskeyListResponse,
  PasskeyRegisterFinishRequest,
  PasskeyRenameRequest,
  RecoveryCountResponse,
  RecoveryGenerateResponse,
  RecoveryLoginRequest,
  RecoveryLoginResponse,
  RequestCodeRequest,
  RequestCodeResponse,
  TotpEnabledResponse,
  TotpSetupResponse,
  TotpVerifyRequest,
  TotpVerifyResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
}

export default authApi
