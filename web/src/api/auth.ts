import endpoints from '@/api/endpoints'
import {
  type AuthUser,
  type RequestCodeRequest,
  type RequestCodeResponse,
  type VerifyCodeRequest,
  type VerifyCodeResponse,
} from '@/api/types/auth'
import { requestHelpers } from '@/lib/request'

const requestCode = (payload: RequestCodeRequest) =>
  requestHelpers.post<RequestCodeResponse>(endpoints.auth.code, payload)

const verifyCode = (payload: VerifyCodeRequest) =>
  requestHelpers.post<VerifyCodeResponse>(endpoints.auth.verify, payload)

export const authApi = {
  requestCode,
  verifyCode,
}

export type {
  AuthUser,
  RequestCodeRequest,
  RequestCodeResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
}

export default authApi
