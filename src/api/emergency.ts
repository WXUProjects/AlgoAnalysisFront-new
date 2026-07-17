import { endpoints, type EmergencyInfo } from '@shared/api'
import { get, post, del, num, str, bool, type ApiResult } from '@/lib/http'

export interface EmergencyListData {
  list: EmergencyInfo[]
  total: number
  page: number
  pageSize: number
}

function normalizeItem(raw: Record<string, unknown>): EmergencyInfo {
  return {
    id: num(raw.id),
    title: str(raw.title),
    content: str(raw.content),
    enabled: bool(raw.enabled),
    sortOrder: num(raw.sortOrder),
    authorId: num(raw.authorId),
    authorName: str(raw.authorName),
    createdAt: num(raw.createdAt),
    updatedAt: num(raw.updatedAt),
  }
}

export async function listActiveEmergencies(): Promise<
  ApiResult<EmergencyInfo[]>
> {
  const res = await get<Record<string, unknown>[]>(
    endpoints.core.emergency.active,
  )
  if (!res.success) return { ...res, data: null }
  const list = Array.isArray(res.data) ? res.data.map(normalizeItem) : []
  return { ...res, data: list }
}

export async function listEmergencies(
  page = 1,
  pageSize = 10,
): Promise<ApiResult<EmergencyListData>> {
  const res = await get<Record<string, unknown>[]>(
    endpoints.core.emergency.list,
    { page, pageSize },
  )
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

export async function createEmergency(body: {
  title: string
  content: string
  enabled: boolean
  sortOrder: number
}): Promise<ApiResult<unknown>> {
  return post(endpoints.core.emergency.create, body)
}

export async function updateEmergency(body: {
  id: number
  title: string
  content: string
  enabled: boolean
  sortOrder: number
}): Promise<ApiResult<unknown>> {
  return post(endpoints.core.emergency.update, body)
}

export async function deleteEmergency(id: number): Promise<ApiResult<unknown>> {
  return del(endpoints.core.emergency.delete, { id })
}

/** 按 ids 顺序重写展示顺序（拖拽排序） */
export async function reorderEmergencies(
  ids: number[],
): Promise<ApiResult<unknown>> {
  return post(endpoints.core.emergency.reorder, { ids })
}
