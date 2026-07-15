import { endpoints, type SubmitLogItem, type Platform } from '@shared/api'
import { get, num, str, type ApiResult } from '@/lib/http'

function normalizeItem(raw: Record<string, unknown>): SubmitLogItem {
  return {
    id: num(raw.id),
    contest: str(raw.contest),
    lang: str(raw.lang),
    platform: str(raw.platform) as Platform,
    problem: str(raw.problem),
    status: str(raw.status),
    submitId: str(raw.submitId),
    time: str(raw.time),
    userId: num(raw.userId),
    problemId: raw.problemId != null ? num(raw.problemId) : undefined,
    userName: str(raw.userName) || undefined,
    problemTitle: str(raw.problemTitle) || undefined,
    problemTags: Array.isArray(raw.problemTags)
      ? (raw.problemTags as unknown[]).map((t) => str(t)).filter(Boolean)
      : undefined,
  }
}

export async function getSubmitLogs(params: {
  userId: number
  cursor?: number | string
  limit?: number
}): Promise<ApiResult<SubmitLogItem[]>> {
  const res = await get<Record<string, unknown>[] | { data?: unknown }>(
    endpoints.core.submitLog.getById,
    {
      userId: params.userId,
      cursor: params.cursor ?? -1,
      limit: params.limit ?? 50,
    },
  )
  if (!res.success) return { ...res, data: [] }

  let list: Record<string, unknown>[] = []
  if (Array.isArray(res.data)) {
    list = res.data
  } else if (res.data && typeof res.data === 'object' && Array.isArray((res.data as { data?: unknown }).data)) {
    list = (res.data as { data: Record<string, unknown>[] }).data
  } else if (res.raw && typeof res.raw === 'object') {
    const raw = res.raw as { data?: unknown }
    if (Array.isArray(raw.data)) list = raw.data as Record<string, unknown>[]
  }

  return { ...res, data: list.map(normalizeItem) }
}
