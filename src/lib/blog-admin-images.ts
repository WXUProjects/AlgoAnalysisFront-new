import type {
  BlogAdminImageAsset,
  BlogAdminImageDeleteResult,
  BlogAdminImageListResult,
  BlogAdminImageMode,
} from '@shared/api'
import type { ApiResult } from '@/lib/http'

function numberOf(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stringOf(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeAdminImageAsset(raw: unknown): BlogAdminImageAsset | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = numberOf(row.id)
  const objectKey = stringOf(row.objectKey)
  if (id <= 0 || !objectKey) return null
  const createdAt = row.createdAt
  return {
    id,
    userId: numberOf(row.userId),
    username: stringOf(row.username),
    name: stringOf(row.name) || undefined,
    objectKey,
    url: stringOf(row.url) || objectKey,
    contentHash: stringOf(row.contentHash) || undefined,
    purpose: stringOf(row.purpose) || 'content',
    createdAt:
      typeof createdAt === 'number' || typeof createdAt === 'string'
        ? createdAt
        : '',
    referenced: Boolean(row.referenced),
  }
}

export function normalizeBlogAdminImages(raw: unknown): BlogAdminImageListResult | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const mode: BlogAdminImageMode = data.mode === 'cleanup' ? 'cleanup' : 'all'
  const list = Array.isArray(data.list)
    ? data.list.flatMap((row) => {
        const normalized = normalizeAdminImageAsset(row)
        return normalized ? [normalized] : []
      })
    : []
  const candidateIds = Array.isArray(data.candidateIds)
    ? [...new Set(data.candidateIds.map((id) => numberOf(id)).filter((id) => id > 0))]
    : []
  return {
    list,
    total: Math.max(0, numberOf(data.total, list.length)),
    page: Math.max(1, numberOf(data.page, 1)),
    pageSize: Math.max(1, numberOf(data.pageSize, 20)),
    mode,
    candidateIds: mode === 'cleanup' ? candidateIds : [],
    snapshot: mode === 'cleanup' ? stringOf(data.snapshot) : '',
  }
}

export interface BlogAdminImageApi {
  list(params: {
    page: number
    pageSize: number
    mode: BlogAdminImageMode
  }): Promise<ApiResult<BlogAdminImageListResult>>
  deleteOne(id: number): Promise<ApiResult<BlogAdminImageDeleteResult>>
  deleteBatch(body: {
    ids: number[]
    snapshot: string
  }): Promise<ApiResult<BlogAdminImageDeleteResult>>
}

export type BlogAdminImageActionOutcome =
  | { kind: 'loaded'; data: BlogAdminImageListResult }
  | { kind: 'deleted'; deleted: number; data: BlogAdminImageListResult | null }
  | { kind: 'refreshed'; message: string; data: BlogAdminImageListResult | null }
  | { kind: 'error'; message: string }

export function createBlogAdminImageController(api: BlogAdminImageApi) {
  let data: BlogAdminImageListResult | null = null

  const load = async (
    mode: BlogAdminImageMode,
    page = 1,
    pageSize = 20,
  ): Promise<BlogAdminImageActionOutcome> => {
    const result = await api.list({ mode, page, pageSize })
    if (!result.success || !result.data) {
      return { kind: 'error', message: result.message || '加载图片失败' }
    }
    data = result.data
    return { kind: 'loaded', data }
  }

  const refreshCleanup = async () => {
    const page = data?.mode === 'cleanup' ? data.page : 1
    const pageSize = data?.pageSize || 20
    return load('cleanup', page, pageSize)
  }

  const deleteOne = async (id: number): Promise<BlogAdminImageActionOutcome> => {
    const result = await api.deleteOne(id)
    if (!result.success) {
      if (result.status === 409) {
        const refreshed = await refreshCleanup()
        return {
          kind: 'refreshed',
          message: result.message || '图片状态已变化',
          data: refreshed.kind === 'loaded' ? refreshed.data : null,
        }
      }
      return { kind: 'error', message: result.message || '删除图片失败' }
    }
    const refreshed = await refreshCleanup()
    return {
      kind: 'deleted',
      deleted: result.data?.deleted ?? 0,
      data: refreshed.kind === 'loaded' ? refreshed.data : null,
    }
  }

  const deleteAll = async (): Promise<BlogAdminImageActionOutcome> => {
    if (!data || data.mode !== 'cleanup' || !data.candidateIds.length || !data.snapshot) {
      return { kind: 'error', message: '请先筛选可清理图片' }
    }
    const result = await api.deleteBatch({
      ids: data.candidateIds,
      snapshot: data.snapshot,
    })
    if (!result.success) {
      if (result.status === 409) {
        const refreshed = await refreshCleanup()
        return {
          kind: 'refreshed',
          message: result.message || '图片状态已变化',
          data: refreshed.kind === 'loaded' ? refreshed.data : null,
        }
      }
      return { kind: 'error', message: result.message || '批量删除失败' }
    }
    const deleted = result.data?.deleted ?? 0
    const refreshed = await refreshCleanup()
    return {
      kind: 'deleted',
      deleted,
      data: refreshed.kind === 'loaded' ? refreshed.data : null,
    }
  }

  return { load, deleteOne, deleteAll, current: () => data }
}
