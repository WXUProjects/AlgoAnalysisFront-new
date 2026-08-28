import {
  endpoints,
  type LuoguPluginAuthorizeCodeReq,
  type LuoguPluginAuthorizeCodeRes,
} from '@shared/api'
import { post, type ApiResult } from '@/lib/http'

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
