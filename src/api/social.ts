import {
  endpoints,
  type PrivacySettings,
  type SocialCounts,
  type SocialListRes,
  type SocialRelation,
  type SocialUser,
} from '@shared/api'
import { get, post, num, str, bool, type ApiResult } from '@/lib/http'
import { normalizeStaticUrl } from '@/lib/static-url'

function normalizeUser(raw: Record<string, unknown>): SocialUser {
  return {
    userId: num(raw.userId),
    username: str(raw.username),
    name: str(raw.name),
    avatar: normalizeStaticUrl(str(raw.avatar)),
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
    message: res.message || (ok ? 'ok' : '加载失败，请稍后重试'),
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
