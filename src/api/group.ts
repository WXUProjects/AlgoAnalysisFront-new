import { endpoints, type GroupInfo, type UserListItem } from '@shared/api'
import { get, post, num, str, type ApiResult } from '@/lib/http'
import { normalizeStaticUrl } from '@/lib/static-url'

export interface GroupListData {
  list: GroupInfo[]
  total: number
}

function normalizeUser(u: Record<string, unknown>): UserListItem {
  return {
    userId: num(u.userId),
    username: str(u.username),
    name: str(u.name),
    groupId: num(u.groupId),
    avatar: normalizeStaticUrl(str(u.avatar)),
    lastSubmit: str(u.lastSubmit),
    roleId: num(u.roleId),
  }
}

function normalizeGroup(g: Record<string, unknown>): GroupInfo {
  const users = Array.isArray(g.users)
    ? (g.users as Record<string, unknown>[]).map(normalizeUser)
    : undefined
  return {
    id: num(g.id),
    name: str(g.name),
    describe: str(g.describe ?? g.description),
    users,
  }
}

export async function listGroups(
  page = 1,
  size = 50,
): Promise<ApiResult<GroupListData>> {
  const res = await get<Record<string, unknown>>(endpoints.user.group.list, {
    page,
    size,
  })
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = (Array.isArray(raw.list)
    ? raw.list
    : Array.isArray(res.data)
      ? res.data
      : []) as Record<string, unknown>[]

  return {
    success: res.success,
    message: res.message || 'ok',
    data: {
      list: listRaw.map(normalizeGroup),
      total: num(raw.total, listRaw.length),
    },
    raw: res.raw,
  }
}

export async function getGroup(id: number): Promise<ApiResult<GroupInfo>> {
  const res = await get<Record<string, unknown>>(endpoints.user.group.get, { id })
  if (!res.success && !res.data) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  if (raw.id === undefined && raw.name === undefined) {
    return { success: false, message: res.message || '分组加载失败，请稍后重试', data: null }
  }
  return { success: true, message: res.message || 'ok', data: normalizeGroup(raw) }
}

export async function createGroup(body: {
  name: string
  describe: string
}): Promise<ApiResult<unknown>> {
  return post(endpoints.user.group.create, body)
}

export async function updateGroup(body: {
  id: number
  name: string
  describe: string
}): Promise<ApiResult<unknown>> {
  return post(endpoints.user.group.update, body)
}

export async function deleteGroup(id: number): Promise<ApiResult<unknown>> {
  return post(endpoints.user.group.delete, { id })
}
