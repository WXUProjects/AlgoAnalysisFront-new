import {
  endpoints,
  type OrgDiscoverItem,
  type OrgInfo,
  type OrgMemberInfo,
} from '@shared/api'
import { get, post, num, str, bool } from '@/lib/http'
import { jwt } from '@/lib/jwt'
import { normalizeStaticUrl } from '@/lib/static-url'

function asList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object' && Array.isArray((raw as { list?: unknown }).list)) {
    return (raw as { list: T[] }).list
  }
  return []
}

export async function listMyOrgs(opts?: { all?: boolean }) {
  const res = await get<{ code?: number; message?: string; list?: OrgInfo[] }>(
    endpoints.user.org.list,
    opts?.all ? { all: '1' } : undefined,
  )
  return {
    success: res.success && (res.data as { code?: number })?.code !== 1,
    message: (res.data as { message?: string })?.message || res.message,
    list: asList<OrgInfo>((res.data as { list?: OrgInfo[] }) ?? res.data),
  }
}

export async function discoverOrgs(params?: {
  page?: number
  pageSize?: number
  q?: string
}) {
  const res = await get<Record<string, unknown>>(endpoints.user.org.discover, {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    ...(params?.q ? { q: params.q } : {}),
  })
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = asList<Record<string, unknown>>(raw.list ?? res.data)
  const list: OrgDiscoverItem[] = listRaw.map((o) => ({
    id: num(o.id),
    name: str(o.name),
    brandLogo: normalizeStaticUrl(str(o.brandLogo)) || undefined,
    memberCount: num(o.memberCount),
    isSystem: bool(o.isSystem),
    isMember: o.isMember === undefined ? undefined : bool(o.isMember),
    isCurrent: o.isCurrent === undefined ? undefined : bool(o.isCurrent),
  }))
  return {
    success: res.success && (raw.code === undefined || num(raw.code) === 0),
    message: str(raw.message) || res.message,
    list,
    total: num(raw.total, list.length),
  }
}

export async function addOrgMember(payload: {
  orgId: number
  userId?: number
  username?: string
  role?: string
  orgDisplayName?: string
}) {
  const res = await post<{ code?: number; message?: string; userId?: number }>(
    endpoints.user.org.addMember,
    payload,
  )
  const body = res.data as { code?: number; message?: string; userId?: number }
  return {
    success: res.success && body?.code !== 1,
    message: body?.message || res.message,
    userId: body?.userId,
  }
}

export async function getOrg(id?: number) {
  const res = await get<{ code?: number; message?: string; data?: OrgInfo }>(
    endpoints.user.org.get,
    id ? { id } : undefined,
  )
  const data = (res.data as { data?: OrgInfo; code?: number })?.data ?? (res.data as OrgInfo)
  return {
    success: res.success,
    message: (res.data as { message?: string })?.message || res.message,
    data,
  }
}

export async function switchOrg(orgId: number) {
  const res = await post<{ code?: number; message?: string; jwtToken?: string }>(
    endpoints.user.org.switch,
    { orgId },
  )
  const body = res.data as { code?: number; message?: string; jwtToken?: string }
  if (body?.jwtToken) {
    jwt.setNewToken(body.jwtToken)
  }
  return {
    success: res.success && body?.code !== 1,
    message: body?.message || res.message,
    jwtToken: body?.jwtToken,
  }
}

export async function joinOrg(inviteCode: string, orgDisplayName: string) {
  const res = await post<{ code?: number; message?: string }>(endpoints.user.org.join, {
    inviteCode,
    orgDisplayName,
  })
  const body = res.data as { code?: number; message?: string }
  return {
    success: res.success && body?.code !== 1,
    message: body?.message || res.message,
  }
}

export async function setOrgDisplayName(payload: {
  orgId: number
  userId?: number
  orgDisplayName: string
}) {
  const res = await post<{ code?: number; message?: string }>(
    endpoints.user.org.setDisplayName,
    payload,
  )
  const body = res.data as { code?: number; message?: string }
  return {
    success: res.success && body?.code !== 1,
    message: body?.message || res.message,
  }
}

export async function leaveOrg(orgId: number) {
  const res = await post<{ code?: number; message?: string; jwtToken?: string }>(
    endpoints.user.org.leave,
    { orgId },
  )
  const body = res.data as { code?: number; message?: string; jwtToken?: string }
  if (body?.jwtToken) {
    jwt.setNewToken(body.jwtToken)
  }
  return {
    success: res.success && body?.code !== 1,
    message: body?.message || res.message,
  }
}

export async function createOrg(payload: {
  name: string
  slug?: string
  adminUserId?: number
  joinMode?: string
  seatLimit?: number
}) {
  const res = await post<OrgInfo | { code?: number; message?: string; data?: OrgInfo }>(
    endpoints.user.org.create,
    payload,
  )
  const raw = res.raw as { code?: number; message?: string; data?: OrgInfo } | undefined
  const data =
    (raw?.data as OrgInfo | undefined) ??
    (res.data && typeof res.data === 'object' && 'id' in res.data
      ? (res.data as OrgInfo)
      : undefined)
  return {
    success: res.success && raw?.code !== 1,
    message: raw?.message || res.message,
    data,
  }
}

export async function updateOrg(payload: Record<string, unknown>) {
  const res = await post<OrgInfo | { code?: number; message?: string; data?: OrgInfo }>(
    endpoints.user.org.update,
    payload,
  )
  const raw = res.raw as { code?: number; message?: string; data?: OrgInfo } | undefined
  const data =
    (raw?.data as OrgInfo | undefined) ??
    (res.data && typeof res.data === 'object' && 'id' in res.data
      ? (res.data as OrgInfo)
      : undefined)
  return {
    success: res.success && raw?.code !== 1,
    message: raw?.message || res.message,
    data,
  }
}

export async function deleteOrg(id: number) {
  const res = await post<{ code?: number; message?: string }>(
    endpoints.user.org.delete,
    { id },
  )
  const body = res.data as { code?: number; message?: string }
  return {
    success: res.success && body?.code !== 1,
    message: body?.message || res.message,
  }
}

export async function listOrgMembers(
  orgId?: number,
  opts?: { page?: number; pageSize?: number; keyword?: string },
) {
  const params: Record<string, string | number> = {}
  if (orgId) params.orgId = orgId
  if (opts?.page) params.page = opts.page
  if (opts?.pageSize) params.pageSize = opts.pageSize
  if (opts?.keyword?.trim()) params.keyword = opts.keyword.trim()
  const res = await get<{
    code?: number
    list?: OrgMemberInfo[]
    total?: number
    page?: number
    pageSize?: number
  }>(endpoints.user.org.members, Object.keys(params).length ? params : undefined)
  const body = (res.data ?? res.raw ?? {}) as {
    list?: OrgMemberInfo[]
    total?: number
    page?: number
    pageSize?: number
  }
  const list = asList<OrgMemberInfo>(body.list ?? res.data)
  return {
    success: res.success,
    list,
    total: Number(body.total ?? list.length) || 0,
    page: Number(body.page ?? opts?.page ?? 1) || 1,
    pageSize: Number(body.pageSize ?? opts?.pageSize ?? 20) || 20,
  }
}

export async function setOrgMemberRole(orgId: number, userId: number, role: string) {
  const res = await post(endpoints.user.org.setRole, { orgId, userId, role })
  const body = res.data as { code?: number; message?: string }
  return {
    success: res.success && body?.code !== 1,
    message: body?.message || res.message,
  }
}

export async function getInvite(orgId?: number) {
  const res = await get<{
    code?: number
    inviteCode?: string
    joinMode?: string
    orgId?: number
  }>(endpoints.user.org.invite, orgId ? { orgId } : undefined)
  return {
    success: res.success,
    inviteCode: (res.data as { inviteCode?: string })?.inviteCode,
    joinMode: (res.data as { joinMode?: string })?.joinMode,
  }
}

export async function rotateInvite(orgId: number) {
  const res = await post<{ code?: number; inviteCode?: string; message?: string }>(
    endpoints.user.org.inviteRotate,
    { orgId },
  )
  const body = res.data as { code?: number; inviteCode?: string; message?: string }
  return {
    success: res.success && body?.code !== 1,
    inviteCode: body?.inviteCode,
    message: body?.message || res.message,
  }
}

export async function listJoinRequests(orgId?: number) {
  const res = await get(endpoints.user.org.joinRequests, orgId ? { orgId } : undefined)
  return {
    success: res.success,
    list: asList((res.data as { list?: unknown[] }) ?? res.data),
  }
}

export async function reviewJoinRequest(id: number, approve: boolean) {
  const res = await post(endpoints.user.org.joinReview, { id, approve })
  const body = res.data as { code?: number; message?: string }
  return {
    success: res.success && body?.code !== 1,
    message: body?.message || res.message,
  }
}
