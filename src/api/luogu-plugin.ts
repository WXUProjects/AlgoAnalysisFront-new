import {
  endpoints,
  type LuoguPluginAuthorizeCodeReq,
  type LuoguPluginAuthorizeCodeRes,
  type LuoguPluginAuthorization,
  type LuoguPluginAuthorizationsRes,
} from '@shared/api'
import { get, post, type ApiResult } from '@/lib/http'

export const LUOGU_USERSCRIPT_INSTALL_URL = 'https://zhiyuansofts.cn/userscript/goalgo-luogu-sync/goalgo-luogu-sync.user.js'
export const LUOGU_USERSCRIPT_UPDATE_URL = 'https://zhiyuansofts.cn/userscript/goalgo-luogu-sync/update.json'

export type LuoguUserscriptRelease = {
  version: string
  downloadUrl: string
}

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

export async function getLatestLuoguUserscript(
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<LuoguUserscriptRelease | null> {
  try {
    const response = await fetcher(`${LUOGU_USERSCRIPT_UPDATE_URL}?t=${now()}`, { cache: 'no-store' })
    if (!response.ok) return null
    const data = await response.json() as Record<string, unknown>
    if (
      typeof data.version !== 'string' ||
      !/^\d+\.\d+\.\d+$/.test(data.version) ||
      data.downloadUrl !== LUOGU_USERSCRIPT_INSTALL_URL
    ) return null
    return { version: data.version, downloadUrl: data.downloadUrl }
  } catch {
    return null
  }
}
