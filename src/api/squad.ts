import { endpoints, type SquadInfo, type ScopeGrant } from '@shared/api'
import { get, post, num, str, type ApiResult } from '@/lib/http'

function bizOk(code: unknown): boolean {
  return code === undefined || code === null || code === 0 || code === '0'
}

export async function listSquads(params?: {
  orgId?: number
  groupId?: number
}): Promise<ApiResult<SquadInfo[]>> {
  const res = await get<Record<string, unknown>>(endpoints.user.org.squads, {
    ...(params?.orgId ? { orgId: params.orgId } : {}),
    ...(params?.groupId ? { groupId: params.groupId } : {}),
  })
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = Array.isArray(raw.list) ? (raw.list as Record<string, unknown>[]) : []
  const list: SquadInfo[] = listRaw.map((s) => ({
    id: num(s.id),
    orgId: num(s.orgId),
    groupId: num(s.groupId),
    name: str(s.name),
    describe: str(s.describe) || undefined,
    memberCount: num(s.memberCount),
  }))
  return {
    success: res.success && bizOk(raw.code),
    message: str(raw.message) || res.message,
    data: list,
  }
}

export async function createSquad(body: {
  orgId?: number
  groupId: number
  name: string
  describe?: string
}): Promise<ApiResult<SquadInfo>> {
  const res = await post<Record<string, unknown>>(endpoints.user.org.squadCreate, body)
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const d = (raw.data ?? {}) as Record<string, unknown>
  return {
    success: res.success && bizOk(raw.code),
    message: str(raw.message) || res.message,
    data: d.id
      ? {
          id: num(d.id),
          orgId: num(d.orgId),
          groupId: num(d.groupId),
          name: str(d.name),
          describe: str(d.describe) || undefined,
        }
      : null,
  }
}

export async function updateSquad(body: {
  id: number
  name?: string
  describe?: string
  groupId?: number
}): Promise<ApiResult<null>> {
  const res = await post<Record<string, unknown>>(endpoints.user.org.squadUpdate, body)
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    success: res.success && bizOk(raw.code),
    message: str(raw.message) || res.message,
    data: null,
  }
}

export async function deleteSquad(id: number): Promise<ApiResult<null>> {
  const res = await post<Record<string, unknown>>(endpoints.user.org.squadDelete, { id })
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    success: res.success && bizOk(raw.code),
    message: str(raw.message) || res.message,
    data: null,
  }
}

export async function listSquadMembers(squadId: number): Promise<
  ApiResult<Array<{ userId: number; username: string; name: string; avatar?: string }>>
> {
  const res = await get<Record<string, unknown>>(endpoints.user.org.squadMembers, { squadId })
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = Array.isArray(raw.list) ? (raw.list as Record<string, unknown>[]) : []
  return {
    success: res.success && bizOk(raw.code),
    message: str(raw.message) || res.message,
    data: listRaw.map((u) => ({
      userId: num(u.userId),
      username: str(u.username),
      name: str(u.name),
      avatar: str(u.avatar) || undefined,
    })),
  }
}

export async function setSquadMember(body: {
  squadId: number
  userId: number
  in: boolean
}): Promise<ApiResult<null>> {
  const res = await post<Record<string, unknown>>(endpoints.user.org.squadMemberSet, body)
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    success: res.success && bizOk(raw.code),
    message: str(raw.message) || res.message,
    data: null,
  }
}

export async function listScopes(params: {
  orgId?: number
  userId: number
}): Promise<ApiResult<ScopeGrant[]>> {
  const res = await get<Record<string, unknown>>(endpoints.user.org.scopes, {
    userId: params.userId,
    ...(params.orgId ? { orgId: params.orgId } : {}),
  })
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = Array.isArray(raw.list) ? (raw.list as Record<string, unknown>[]) : []
  return {
    success: res.success && bizOk(raw.code),
    message: str(raw.message) || res.message,
    data: listRaw.map((g) => ({
      scopeType: (str(g.scopeType) === 'squad' ? 'squad' : 'group') as 'group' | 'squad',
      scopeId: num(g.scopeId),
    })),
  }
}

export async function setScopes(body: {
  orgId?: number
  userId: number
  grants: ScopeGrant[]
}): Promise<ApiResult<null>> {
  const res = await post<Record<string, unknown>>(endpoints.user.org.scopesSet, body)
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    success: res.success && bizOk(raw.code),
    message: str(raw.message) || res.message,
    data: null,
  }
}
