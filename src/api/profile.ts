import { endpoints, type UserProfile, type UserListRes } from '@shared/api'
import { get, post, num, str, bool, type ApiResult } from '@/lib/http'
import { normalizeStaticUrl } from '@/lib/static-url'

function normalizeProfile(raw: Record<string, unknown>): UserProfile {
  const spiders = Array.isArray(raw.spiders)
    ? (raw.spiders as Record<string, unknown>[]).map((s) => ({
        platform: str(s.platform),
        username: str(s.username),
      }))
    : []
  return {
    userId: num(raw.userId),
    username: str(raw.username),
    name: str(raw.name),
    email: str(raw.email),
    groupId: num(raw.groupId),
    avatar: normalizeStaticUrl(str(raw.avatar)),
    emailEnabled: bool(raw.emailEnabled),
    roleId: num(raw.roleId),
    spiders,
  }
}

export async function getProfileById(userId: number): Promise<ApiResult<UserProfile>> {
  const res = await get<Record<string, unknown>>(endpoints.user.profile.getById, {
    userId,
  })
  if (!res.success || !res.data) return { ...res, data: null }
  return { ...res, data: normalizeProfile(res.data) }
}

export async function getProfileByName(
  name: string,
): Promise<ApiResult<UserProfile[]>> {
  const res = await get<Record<string, unknown>>(endpoints.user.profile.getByName, {
    name,
  })
  if (!res.success) return { ...res, data: [] }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  let listRaw: Record<string, unknown>[] = []
  if (Array.isArray(res.data)) listRaw = res.data as Record<string, unknown>[]
  else if (Array.isArray(raw.list)) listRaw = raw.list as Record<string, unknown>[]
  else if (raw.userId !== undefined) listRaw = [raw]
  return { ...res, data: listRaw.map(normalizeProfile) }
}

export async function updateProfile(body: {
  userId: number
  name: string
  email: string
  avatar?: string
}): Promise<ApiResult<unknown>> {
  return post(endpoints.user.profile.update, body)
}

export async function setEmailEnabled(
  userId: number,
  enabled: boolean,
): Promise<ApiResult<unknown>> {
  return post(endpoints.user.profile.setEmailEnabled, { userId, enabled })
}

export async function moveGroup(body: {
  userId: number
  groupId: number
}): Promise<ApiResult<unknown>> {
  return post(endpoints.user.profile.moveGroup, body)
}

export async function deleteUser(userId: number): Promise<ApiResult<unknown>> {
  return post(endpoints.user.profile.delete, { userId })
}

export async function listProfiles(
  pageNum = 1,
  pageSize = 10,
): Promise<ApiResult<UserListRes>> {
  const res = await get<Record<string, unknown>>(endpoints.user.profile.list, {
    pageNum,
    pageSize,
  })
  // list 可能无 success 字段，裸 { list, total }
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = (Array.isArray(raw.list)
    ? raw.list
    : Array.isArray(res.data)
      ? res.data
      : ((raw as { list?: unknown }).list as Record<string, unknown>[] | undefined) ||
        []) as Record<string, unknown>[]

  if (!res.success && !listRaw.length && raw.list === undefined) {
    return { ...res, data: null }
  }

  return {
    success: true,
    message: res.message || 'ok',
    data: {
      total: num(raw.total, listRaw.length),
      list: listRaw.map((u) => ({
        userId: num(u.userId),
        username: str(u.username),
        name: str(u.name),
        groupId: num(u.groupId),
        avatar: normalizeStaticUrl(str(u.avatar)),
        lastSubmit: str(u.lastSubmit),
        roleId: num(u.roleId),
      })),
    },
    raw: res.raw,
  }
}
