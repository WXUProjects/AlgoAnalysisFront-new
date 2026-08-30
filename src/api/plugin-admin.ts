import {
  endpoints,
  type AdminListClientSyncAuditsReq,
  type AdminListClientSyncAuditsRes,
  type AdminListPluginAuthorizationsReq,
  type AdminListPluginAuthorizationsRes,
  type AdminPluginAuthorizationInfo,
  type ClientSyncAuditInfo,
} from '@shared/api'
import { get, num, str, type ApiResult } from '@/lib/http'

type PluginAuditRequest = Omit<AdminListClientSyncAuditsReq, 'from' | 'to'> & {
  from?: number
  to?: number
}

function platformValue(value: string | undefined): string | undefined {
  return value === 'LuoGu' || value === 'luogu' ? 'luogu' : value
}

function authorization(raw: Record<string, unknown>): AdminPluginAuthorizationInfo {
  return {
    id: str(raw.id), userId: str(raw.userId), username: str(raw.username), name: str(raw.name), provider: str(raw.provider), platform: str(raw.platform), ojUid: str(raw.ojUid), clientKind: str(raw.clientKind), clientVersion: str(raw.clientVersion), acceptedAt: num(raw.acceptedAt), expiresAt: num(raw.expiresAt), lastUsedAt: num(raw.lastUsedAt), revokedAt: num(raw.revokedAt), status: str(raw.status),
  }
}

export function latestAuthorizationRows(rows: AdminPluginAuthorizationInfo[]): AdminPluginAuthorizationInfo[] {
  const latest = new Map<string, AdminPluginAuthorizationInfo>()
  for (const row of rows) {
    const key = `${row.userId}:${row.provider || row.platform}:${row.ojUid}:${row.clientKind}`
    const current = latest.get(key)
    if (!current || Number(row.id) > Number(current.id)) latest.set(key, row)
  }
  return [...latest.values()]
}

function audit(raw: Record<string, unknown>): ClientSyncAuditInfo {
  return {
    sessionId: str(raw.sessionId), authorizationId: str(raw.authorizationId), userId: str(raw.userId), username: str(raw.username), platform: str(raw.platform), ojUid: str(raw.ojUid), clientKind: str(raw.clientKind), clientVersion: str(raw.clientVersion), status: str(raw.status) as ClientSyncAuditInfo['status'], completionReason: str(raw.completionReason), startedAt: num(raw.startedAt), updatedAt: num(raw.updatedAt), terminalAt: num(raw.terminalAt), processedPages: num(raw.processedPages), remoteCount: num(raw.remoteCount), inserted: num(raw.inserted), restartCount: num(raw.restartCount), errorCode: str(raw.errorCode), errorMessage: str(raw.errorMessage),
  }
}

function unwrap<T>(res: ApiResult<T>): T | null {
  if (!res.data) return null
  const data = res.data as T & { data?: T }
  return data.data && typeof data.data === 'object' ? data.data : data
}

export async function listPluginAuthorizations(params: AdminListPluginAuthorizationsReq): Promise<ApiResult<AdminListPluginAuthorizationsRes>> {
  const res = await get<AdminListPluginAuthorizationsRes>(endpoints.user.admin.plugins.authorizations, { ...params, platform: platformValue(params.platform) } as unknown as Record<string, unknown>)
  const data = unwrap(res)
  if (!res.success || !data) return { ...res, data: { list: [], total: 0, pageNum: params.pageNum, pageSize: params.pageSize } }
  return { ...res, data: { ...data, list: (data.list || []).map((item) => authorization(item as unknown as Record<string, unknown>)), total: num(data.total) } }
}

export async function listSyncAudits(params: PluginAuditRequest): Promise<ApiResult<AdminListClientSyncAuditsRes>> {
  const res = await get<AdminListClientSyncAuditsRes>(endpoints.core.admin.plugins.syncAudits, { ...params, platform: platformValue(params.platform) } as unknown as Record<string, unknown>)
  const data = unwrap(res)
  if (!res.success || !data) return { ...res, data: { list: [], total: 0, pageNum: params.pageNum, pageSize: params.pageSize } }
  return { ...res, data: { ...data, list: (data.list || []).map((item) => audit(item as unknown as Record<string, unknown>)), total: num(data.total) } }
}
