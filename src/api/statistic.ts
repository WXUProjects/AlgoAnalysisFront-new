import {
  endpoints,
  type HeatmapItem,
  type PeriodData,
  type PeriodItem,
  type StatisticRankItem,
} from '@shared/api'
import { get, num, str, type ApiResult } from '@/lib/http'

function normalizePeriodItem(raw: Record<string, unknown> | undefined): PeriodItem {
  const r = raw ?? {}
  const total = num(r.total)
  const totalRaw =
    r.totalRaw !== undefined && r.totalRaw !== null ? num(r.totalRaw) : undefined
  return {
    today: num(r.today),
    thisWeek: num(r.thisWeek),
    lastWeek: num(r.lastWeek),
    thisMonth: num(r.thisMonth),
    lastMonth: num(r.lastMonth),
    thisYear: num(r.thisYear),
    lastYear: num(r.lastYear),
    total,
    ...(totalRaw !== undefined ? { totalRaw } : {}),
  }
}

export async function getPeriod(userId: number): Promise<ApiResult<PeriodData>> {
  const res = await get<Record<string, unknown>>(endpoints.core.statistic.period, {
    userId,
  })
  if (!res.success || !res.data) return { ...res, data: null }
  const d = res.data
  return {
    ...res,
    data: {
      ac: normalizePeriodItem(d.ac as Record<string, unknown>),
      submit: normalizePeriodItem(d.submit as Record<string, unknown>),
    },
  }
}

export async function getRank(params: {
  startDate: string
  endDate: string
  scoreType?: 'submit' | 'ac'
  page?: number
  pageSize?: number
  groupId?: number
}): Promise<ApiResult<{ list: StatisticRankItem[]; total: number }>> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.statistic.rank, {
    startDate: params.startDate,
    endDate: params.endDate,
    scoreType: params.scoreType ?? 'ac',
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    ...(params.groupId !== undefined ? { groupId: params.groupId } : {}),
  })
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  let listRaw: Record<string, unknown>[] = []
  if (Array.isArray(res.data)) listRaw = res.data
  else if (Array.isArray(raw.data)) listRaw = raw.data as Record<string, unknown>[]
  return {
    ...res,
    data: {
      total: num(raw.total, listRaw.length),
      list: listRaw.map((r) => ({
        rank: num(r.rank),
        userId: num(r.userId),
        name: str(r.name),
        score: num(r.score),
      })),
    },
  }
}

export async function getHeatmap(params: {
  startDate: string
  endDate: string
  isAc: boolean
  userId?: number
}): Promise<ApiResult<HeatmapItem[]>> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.statistic.heatmap, {
    startDate: params.startDate,
    endDate: params.endDate,
    isAc: params.isAc,
    ...(params.userId !== undefined ? { userId: params.userId } : {}),
  })
  if (!res.success || !res.data) return { ...res, data: [] }
  const list = Array.isArray(res.data) ? res.data : []
  return {
    ...res,
    data: list.map((item) => ({
      date: str(item.date),
      count: num(item.count),
    })),
  }
}
