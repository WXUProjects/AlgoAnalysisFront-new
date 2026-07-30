import type { BlogImageOrphan } from '@shared/api'

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
