import type {
  BlogImageCleanupPreview,
  BlogImageGcRequest,
  BlogImageGcResult,
  BlogImageOrphan,
} from '@shared/api'

export type BlogImageCleanupApiResult<T> = {
  success: boolean
  message: string
  data: T | null
  status?: number
}

export type BlogImageCleanupOutcome =
  | {
      kind: 'preview'
      preview: BlogImageCleanupPreview
      status?: number
    }
  | { kind: 'empty'; preview: null; status?: number }
  | {
      kind: 'preview-error'
      preview: null
      message: string
      status?: number
    }
  | {
      kind: 'confirmed'
      preview: null
      deleted: number
      status?: number
    }
  | {
      kind: 'refreshed'
      preview: BlogImageCleanupPreview | null
      reason: 'stale' | 'partial'
      message: string
      status: number
      refreshStatus?: number
    }
  | {
      kind: 'refresh-error'
      preview: null
      reason: 'stale' | 'partial'
      message: string
      refreshMessage: string
      status: number
      refreshStatus?: number
    }
  | {
      kind: 'confirm-error'
      preview: BlogImageCleanupPreview
      message: string
      status?: number
    }
  | { kind: 'busy'; preview: BlogImageCleanupPreview | null }
  | { kind: 'no-preview'; preview: null }

export type BlogImageCleanupController = {
  loadPreview: () => Promise<BlogImageCleanupOutcome>
  confirmPreview: () => Promise<BlogImageCleanupOutcome>
  clear: () => void
  isConfirming: () => boolean
}

function valueOf(
  row: Record<string, unknown>,
  camel: string,
  legacy: string,
): unknown {
  return row[camel] ?? row[legacy]
}

export function normalizeBlogImageOrphans(raw: unknown): BlogImageOrphan[] {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((value) => {
    if (!value || typeof value !== 'object') return []
    const row = value as Record<string, unknown>
    const id = Number(valueOf(row, 'id', 'ID'))
    const objectKey = String(valueOf(row, 'objectKey', 'ObjectKey') ?? '').trim()
    if (!Number.isFinite(id) || id <= 0 || !objectKey) return []

    const url = String(valueOf(row, 'url', 'URL') ?? objectKey).trim()
    const contentHash = String(
      valueOf(row, 'contentHash', 'ContentHash') ?? '',
    ).trim()
    const createdAt = valueOf(row, 'createdAt', 'CreatedAt')

    return [{
      id,
      objectKey,
      url: url || objectKey,
      contentHash: contentHash || undefined,
      createdAt:
        typeof createdAt === 'string' || typeof createdAt === 'number'
          ? createdAt
          : undefined,
      protected: Boolean(valueOf(row, 'protected', 'Protected')),
    }]
  })
}

export function normalizeBlogImageCleanupPreview(
  raw: unknown,
): BlogImageCleanupPreview | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const orphans = normalizeBlogImageOrphans(row.orphans)
  if (!Array.isArray(row.candidateIds)) return null
  const candidateIds = row.candidateIds.map(Number)
  if (
    candidateIds.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
    new Set(candidateIds).size !== candidateIds.length
  ) {
    return null
  }
  const snapshot = String(row.snapshot ?? '').trim()
  if (!snapshot || candidateIds.length !== orphans.length) return null
  return {
    orphans,
    total: Number.isFinite(Number(row.total)) ? Number(row.total) : orphans.length,
    candidateIds,
    snapshot,
  }
}

export function buildBlogImageGcRequest(
  preview: Pick<BlogImageCleanupPreview, 'candidateIds' | 'snapshot'>,
): BlogImageGcRequest {
  return {
    candidateIds: [...preview.candidateIds],
    snapshot: preview.snapshot,
  }
}

/**
 * 手动图片清理状态机：预览只读；一次人工确认最多发一个 POST。
 * 409/502 会消费旧快照并只做一次 GET 刷新，不自动再次确认。
 */
export function createBlogImageCleanupController(api: {
  preview: () => Promise<BlogImageCleanupApiResult<BlogImageCleanupPreview>>
  confirm: (
    body: BlogImageGcRequest,
  ) => Promise<BlogImageCleanupApiResult<BlogImageGcResult>>
}): BlogImageCleanupController {
  let preview: BlogImageCleanupPreview | null = null
  let confirming = false

  const storePreview = (next: BlogImageCleanupPreview) => {
    preview = next.orphans.length > 0 ? next : null
    return preview
  }

  return {
    async loadPreview() {
      const result = await api.preview()
      if (!result.success || !result.data) {
        preview = null
        return {
          kind: 'preview-error',
          preview: null,
          message: result.message,
          status: result.status,
        }
      }
      const next = storePreview(result.data)
      return next
        ? { kind: 'preview', preview: next, status: result.status }
        : { kind: 'empty', preview: null, status: result.status }
    },

    async confirmPreview() {
      if (confirming) return { kind: 'busy', preview }
      if (!preview) return { kind: 'no-preview', preview: null }

      const submitted = preview
      confirming = true
      try {
        const result = await api.confirm(buildBlogImageGcRequest(submitted))
        if (result.success && result.data) {
          preview = null
          return {
            kind: 'confirmed',
            preview: null,
            deleted: result.data.deleted,
            status: result.status,
          }
        }

        if (result.status === 409 || result.status === 502) {
          const reason = result.status === 409 ? 'stale' : 'partial'
          const status = result.status
          preview = null
          const refreshed = await api.preview()
          if (!refreshed.success || !refreshed.data) {
            return {
              kind: 'refresh-error',
              preview: null,
              reason,
              message: result.message,
              refreshMessage: refreshed.message,
              status,
              refreshStatus: refreshed.status,
            }
          }
          const next = storePreview(refreshed.data)
          return {
            kind: 'refreshed',
            preview: next,
            reason,
            message: result.message,
            status,
            refreshStatus: refreshed.status,
          }
        }

        preview = submitted
        return {
          kind: 'confirm-error',
          preview: submitted,
          message: result.message,
          status: result.status,
        }
      } catch {
        preview = submitted
        return {
          kind: 'confirm-error',
          preview: submitted,
          message: '清理失败',
        }
      } finally {
        confirming = false
      }
    },

    clear() {
      preview = null
    },

    isConfirming() {
      return confirming
    },
  }
}
