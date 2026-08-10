import {
  endpoints,
  type PrivacySettings,
  type SharedOrgAlias,
  type SocialCounts,
  type SocialListRes,
  type SocialRelation,
  type SocialUser,
} from '@shared/api'
import { get, post, num, str, bool, type ApiResult } from '@/lib/http'
import { normalizeStaticUrl } from '@/lib/static-url'

function normalizeSharedOrgs(raw: unknown): SharedOrgAlias[] {
  if (!Array.isArray(raw)) return []
  return (raw as Record<string, unknown>[])
    .map((a) => ({
      orgId: num(a.orgId),
      orgName: str(a.orgName),
      displayName: str(a.displayName),
    }))
    .filter((a) => a.orgId > 0 && a.displayName)
}

/** 自定义站点角色名：滤掉空串，最多保留 3 个，避免徽章挤爆一行 */
function normalizeSiteRoles(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out = raw
    .map((x) => str(x).trim())
    .filter((x) => x.length > 0)
    .slice(0, 3)
  return out
}

function normalizeUser(raw: Record<string, unknown>): SocialUser {
  return {
    userId: num(raw.userId),
    username: str(raw.username),
    name: str(raw.name),
    avatar: normalizeStaticUrl(str(raw.avatar)),
    inCurrentOrg: raw.inCurrentOrg === undefined ? undefined : bool(raw.inCurrentOrg),
    sharedOrgs: normalizeSharedOrgs(raw.sharedOrgs),
    isSiteAdmin:
      raw.isSiteAdmin === undefined ? undefined : bool(raw.isSiteAdmin),
    siteRoles: normalizeSiteRoles(raw.siteRoles),
    subTier: raw.subTier ? str(raw.subTier) : undefined,
  }
}

function parseList(res: ApiResult<unknown>): ApiResult<SocialListRes> {
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = (Array.isArray(raw.list)
    ? raw.list
    : Array.isArray(res.data)
      ? res.data
      : []) as Record<string, unknown>[]
  const ok = res.success || raw.list !== undefined || Array.isArray(res.data)
  return {
    success: ok,
    message: res.message || (ok ? 'ok' : '没加载出来，过会儿再试'),
    data: {
      total: num(raw.total, listRaw.length),
      list: listRaw.map(normalizeUser),
    },
    raw: res.raw,
  }
}

export async function followUser(userId: number): Promise<ApiResult<unknown>> {
  return post(endpoints.user.social.follow, { userId })
}

export async function unfollowUser(userId: number): Promise<ApiResult<unknown>> {
  return post(endpoints.user.social.unfollow, { userId })
}

export async function listFollowing(
  userId: number,
  page = 1,
  pageSize = 20,
): Promise<ApiResult<SocialListRes>> {
  const res = await get(endpoints.user.social.following, { userId, page, pageSize })
  return parseList(res)
}

export async function listFollowers(
  userId: number,
  page = 1,
  pageSize = 20,
): Promise<ApiResult<SocialListRes>> {
  const res = await get(endpoints.user.social.followers, { userId, page, pageSize })
  return parseList(res)
}

export async function getSocialCounts(
  userId: number,
): Promise<ApiResult<SocialCounts>> {
  const res = await get<Record<string, unknown>>(endpoints.user.social.counts, {
    userId,
  })
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      followingCount: num(raw.followingCount),
      followerCount: num(raw.followerCount),
    },
  }
}

export async function getSocialRelation(
  userId: number,
): Promise<ApiResult<SocialRelation>> {
  const res = await get<Record<string, unknown>>(endpoints.user.social.relation, {
    userId,
  })
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      isFollowing: bool(raw.isFollowing),
      isFollower: bool(raw.isFollower),
    },
  }
}

export async function searchUsers(
  q: string,
  page = 1,
  pageSize = 20,
): Promise<ApiResult<SocialListRes>> {
  const res = await get(endpoints.user.social.search, { q, page, pageSize })
  return parseList(res)
}

/** 单用户域感知展示名（资料页标题等） */
export async function getSocialIdentity(
  userId: number,
): Promise<ApiResult<SocialUser>> {
  const res = await get<Record<string, unknown>>(endpoints.user.social.identity, {
    userId,
  })
  // http 层：body.data → res.data；无 data 字段时 rest 落在 res.data
  const rawBody = (res.raw ?? {}) as Record<string, unknown>
  const dataRaw = (
    res.data && typeof res.data === 'object' && 'userId' in (res.data as object)
      ? res.data
      : rawBody.data && typeof rawBody.data === 'object'
        ? rawBody.data
        : res.data
  ) as Record<string, unknown> | null
  if (!dataRaw || (dataRaw.userId === undefined && dataRaw.username === undefined)) {
    return {
      success: false,
      message: res.message || '找不到该用户',
      data: null,
      status: res.status,
    }
  }
  return {
    success: true,
    message: res.message || 'ok',
    data: normalizeUser(dataRaw),
    raw: res.raw,
    status: res.status,
  }
}

export async function getPrivacy(): Promise<ApiResult<PrivacySettings>> {
  const res = await get<Record<string, unknown>>(endpoints.user.privacy.get)
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      privacyConfigured: bool(raw.privacyConfigured),
      allowPublicProfile:
        raw.allowPublicProfile === undefined ? true : bool(raw.allowPublicProfile),
      allowPublicFeed:
        raw.allowPublicFeed === undefined ? true : bool(raw.allowPublicFeed),
    },
  }
}

export async function updatePrivacy(body: {
  allowPublicProfile: boolean
  allowPublicFeed: boolean
}): Promise<ApiResult<PrivacySettings>> {
  const res = await post<Record<string, unknown>>(endpoints.user.privacy.update, body)
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      privacyConfigured: true,
      allowPublicProfile:
        raw.allowPublicProfile === undefined
          ? body.allowPublicProfile
          : bool(raw.allowPublicProfile),
      allowPublicFeed:
        raw.allowPublicFeed === undefined
          ? body.allowPublicFeed
          : bool(raw.allowPublicFeed),
    },
  }
}

export async function getPrivacyStatus(): Promise<
  ApiResult<{ privacyConfigured: boolean }>
> {
  const res = await get<Record<string, unknown>>(endpoints.user.privacy.status)
  // 后端未部署时不强制弹窗，避免卡住全站
  if (!res.success || res.status === 404 || res.status === 401) {
    return {
      success: true,
      message: res.message || 'ok',
      data: { privacyConfigured: true },
    }
  }
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      privacyConfigured:
        raw.privacyConfigured === undefined ? true : bool(raw.privacyConfigured),
    },
  }
}
