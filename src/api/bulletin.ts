import { endpoints, type BulletinInfo } from '@shared/api'
import { get, post, del, num, str, bool, type ApiResult } from '@/lib/http'

export interface BulletinListData {
  list: BulletinInfo[]
  total: number
  page: number
  pageSize: number
}

function normalizeItem(raw: Record<string, unknown>): BulletinInfo {
  return {
    id: num(raw.id),
    title: str(raw.title),
    content: str(raw.content),
    authorId: num(raw.authorId),
    authorName: str(raw.authorName),
    isPinned: bool(raw.isPinned),
    createdAt: num(raw.createdAt),
    updatedAt: num(raw.updatedAt),
  }
}

export async function listBulletins(
  page = 1,
  pageSize = 10,
): Promise<ApiResult<BulletinListData>> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.bulletin.list, {
    page,
    pageSize,
  })
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
