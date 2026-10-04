import {
  LUOGU_PLUGIN_RISK_VERSION,
  type LuoguPluginAuthorizeCodeReq,
  type LuoguPluginClientKind,
} from '@shared/api'

export const LUOGU_AUTHORIZE_TARGET_ORIGIN = 'https://www.luogu.com.cn'
export const QOJ_AUTHORIZE_TARGET_ORIGIN = 'https://qoj.ac'

const CLIENT_KINDS = new Set<LuoguPluginClientKind>([
  'userscript',
])

const STATE_PATTERN = /^[A-Za-z0-9._~-]{16,256}$/
const PKCE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/
const LUOGU_UID_PATTERN = /^[1-9][0-9]{0,9}$/
const QOJ_USERNAME_PATTERN = /^[A-Za-z0-9_]{1,64}$/

export type SyncAuthorizePlatform = 'LuoGu' | 'QOJ'

export type LuoguAuthorizeQuery = {
  state: string
  codeChallenge: string
  luoguUid: string
  clientKind: LuoguPluginClientKind
  clientVersion: string
  platform: SyncAuthorizePlatform
}

export type LuoguAuthorizeQueryResult =
  | { ok: true; value: LuoguAuthorizeQuery }
  | { ok: false; message: string }

function requiredQueryValue(query: URLSearchParams, name: string) {
  const values = query.getAll(name)
  return values.length === 1 ? values[0] : ''
}

export function parseLuoguAuthorizeQuery(
  query: URLSearchParams,
): LuoguAuthorizeQueryResult {
  const state = requiredQueryValue(query, 'state')
  if (!STATE_PATTERN.test(state)) {
    return { ok: false, message: '授权信息无效，请返回洛谷后重新连接。' }
  }

  const codeChallenge = requiredQueryValue(query, 'code_challenge')
  if (!PKCE_CHALLENGE_PATTERN.test(codeChallenge)) {
    return { ok: false, message: '授权信息无效，请返回洛谷后重新连接。' }
  }

  const platformValues = query.getAll('platform')
  if (platformValues.length > 1) {
    return { ok: false, message: '平台信息无效，请返回同步工具后重新连接。' }
  }
  const platformValue = platformValues[0] ?? ''
  if (platformValue !== '' && platformValue !== 'LuoGu' && platformValue !== 'QOJ') {
    return { ok: false, message: '平台信息无效，请返回同步工具后重新连接。' }
  }
  const platform: SyncAuthorizePlatform = platformValue === 'QOJ' ? 'QOJ' : 'LuoGu'
  const luoguUid = requiredQueryValue(query, 'luogu_uid')
  if (platform === 'QOJ' ? !QOJ_USERNAME_PATTERN.test(luoguUid) : !LUOGU_UID_PATTERN.test(luoguUid)) {
    return { ok: false, message: platform === 'QOJ' ? 'QOJ 账号信息无效，请返回 QOJ 后重新连接。' : '洛谷账号信息无效，请返回洛谷后重新连接。' }
  }

  const clientKind = requiredQueryValue(query, 'client_kind')
  if (!CLIENT_KINDS.has(clientKind as LuoguPluginClientKind)) {
    return { ok: false, message: '当前客户端不受支持，请更新同步工具。' }
  }

  const clientVersion = requiredQueryValue(query, 'client_version').trim()
  const hasControlCharacter = Array.from(clientVersion).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint < 32 || codePoint === 127
  })
  if (
    !clientVersion ||
    new TextEncoder().encode(clientVersion).byteLength > 64 ||
    hasControlCharacter
  ) {
    return { ok: false, message: '客户端版本信息无效，请更新同步工具。' }
  }

  return {
    ok: true,
    value: {
      state,
      codeChallenge,
      luoguUid,
      clientKind: clientKind as LuoguPluginClientKind,
      clientVersion,
      platform,
    },
  }
}

export function buildLuoguAuthorizeCodeRequest(
  query: LuoguAuthorizeQuery,
): LuoguPluginAuthorizeCodeReq {
  return {
    ...query,
    codeChallengeMethod: 'S256',
    scope: 'luogu.sync',
    riskAccepted: true,
    riskVersion: LUOGU_PLUGIN_RISK_VERSION,
    platform: query.platform,
  }
}

export function authorizeTargetOrigin(platform: SyncAuthorizePlatform): string {
  return platform === 'QOJ' ? QOJ_AUTHORIZE_TARGET_ORIGIN : LUOGU_AUTHORIZE_TARGET_ORIGIN
}

type PostMessage = (message: unknown, targetOrigin: string) => void

export function createAuthorizationCodeMessenger(postMessage?: PostMessage, platform: SyncAuthorizePlatform = 'LuoGu') {
  let sent = false

  return (state: string, code: string) => {
    if (sent || !code || !postMessage) return false
    try {
      postMessage(
        { type: 'goalgo.luogu.authorized', state, code },
        authorizeTargetOrigin(platform),
      )
      sent = true
      return true
    } catch {
      return false
    }
  }
}
