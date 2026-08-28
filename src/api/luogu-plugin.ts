import {
  endpoints,
  type LuoguPluginAuthorizeCodeReq,
  type LuoguPluginAuthorizeCodeRes,
  type LuoguPluginAuthorization,
  type LuoguPluginAuthorizationsRes,
} from '@shared/api'
import { get, post, type ApiResult } from '@/lib/http'

export type LuoguAuthorizeCode = Pick<
  LuoguPluginAuthorizeCodeRes,
  'code' | 'expiresAt'
>

export function createLuoguAuthorizeCode(
  request: LuoguPluginAuthorizeCodeReq,
): Promise<ApiResult<LuoguAuthorizeCode>> {
  return post<LuoguAuthorizeCode>(
    endpoints.user.plugin.luogu.authorizeCode,
    request,
    { responseShape: 'bare' },
  )
}

export function listLuoguAuthorizations(): Promise<ApiResult<LuoguPluginAuthorizationsRes>> {
  return get<LuoguPluginAuthorizationsRes>(endpoints.user.plugin.luogu.authorizations)
}

export function activeLuoguAuthorization(
  authorizations: LuoguPluginAuthorization[] | undefined,
  uid?: string,
): LuoguPluginAuthorization | undefined {
  return authorizations?.find((item) =>
    item.provider === 'luogu' &&
    (!uid || item.luoguUid === uid) &&
    Number(item.revokedAt || 0) === 0 &&
    Number(item.expiresAt || 0) * 1000 > Date.now(),
  )
}
