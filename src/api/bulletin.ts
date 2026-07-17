import { endpoints, type BulletinInfo, type BulletinScope } from '@shared/api'
import { get, post, del, num, str, bool, type ApiResult } from '@/lib/http'

export interface BulletinListData {
  list: BulletinInfo[]
  total: number
  page: number
  pageSize: number
}

function normalizeItem(raw: Record<string, unknown>): BulletinInfo {
  const scopeRaw = str(raw.scope)
  const scope: BulletinScope = scopeRaw === 'org' ? 'org' : scopeRaw === 'site' ? 'site' : scopeRaw || 'site'
  return {
    id: num(raw.id),
    title: str(raw.title),
    content: str(raw.content),
    authorId: num(raw.authorId),
    authorName: str(raw.authorName),
    isPinned: bool(raw.isPinned),
    createdAt: num(raw.createdAt),
    updatedAt: num(raw.updatedAt),
    scope,
    orgId: num(raw.orgId),
  }
}

export async function listBulletins(
  page = 1,
  pageSize = 10,
  scope?: 'site' | 'org' | '',
): Promise<ApiResult<BulletinListData>> {
  const params: Record<string, string | number> = { page, pageSize }
  if (scope) params.scope = scope
  const res = await get<Record<string, unknown>[]>(endpoints.core.bulletin.list, params)
  if (!res.success) return { ...res, data: null }
  const list = Array.isArray(res.data) ? res.data.map(normalizeItem) : []
  const raw = (res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      list,
      total: num(raw.total, list.length),
      page: num(raw.page, page),
      pageSize: num(raw.pageSize, pageSize),
    },
  }
}

export async function createBulletin(body: {
  title: string
  content: string
  isPinned: boolean
  scope: 'site' | 'org'
}): Promise<ApiResult<unknown>> {
  return post(endpoints.core.bulletin.create, body)
}

export async function updateBulletin(body: {
  id: number
  title: string
  content: string
  isPinned: boolean
}): Promise<ApiResult<unknown>> {
  return post(endpoints.core.bulletin.update, body)
}

export async function deleteBulletin(id: number): Promise<ApiResult<unknown>> {
  return del(endpoints.core.bulletin.delete, { id })
}
