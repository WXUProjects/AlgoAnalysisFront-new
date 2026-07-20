import {
  endpoints,
  type HeatmapItem,
  type PeriodData,
  type PeriodItem,
  type StatisticRankItem,
} from '@shared/api'
import { get, num, str, type ApiResult } from '@/lib/http'
import { ymdToDateKey } from '@/lib/format'

/** rank / heatmap 要求 YYYY-MM-DD；兼容内部 YYYYMMDD */
function apiDate(ymd: string): string {
  return ymdToDateKey(ymd)
}

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
  // 后端 pageSize 上限 50；超过会被截断，snap 缓存也要求 ≤50
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 50)
  const res = await get<Record<string, unknown>[]>(endpoints.core.statistic.rank, {
    startDate: apiDate(params.startDate),
    endDate: apiDate(params.endDate),
    scoreType: params.scoreType ?? 'ac',
    page: params.page ?? 1,
    pageSize,
    ...(params.groupId !== undefined ? { groupId: params.groupId } : {}),
  })
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  let listRaw: Record<string, unknown>[] = []
  if (Array.isArray(res.data)) listRaw = res.data
  else if (Array.isArray(raw.data)) listRaw = raw.data as Record<string, unknown>[]
  // total 在 body 顶层（与 data 并列），也兼容 data.total
  const nested =
    res.data && typeof res.data === 'object' && !Array.isArray(res.data)
      ? (res.data as Record<string, unknown>)
      : null
  if (nested && Array.isArray(nested.list)) {
    listRaw = nested.list as Record<string, unknown>[]
  }
  const totalRaw = raw.total ?? nested?.total
  return {
    ...res,
    data: {
      total: num(totalRaw, listRaw.length),
      list: listRaw.map((r) => ({
        rank: num(r.rank ?? r.Rank),
        userId: num(r.userId ?? r.user_id ?? r.UserId),
        name: str(r.name ?? r.Name),
        score: num(r.score ?? r.Score),
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
    startDate: apiDate(params.startDate),
    endDate: apiDate(params.endDate),
    // 网关/部分环境对 boolean query 不稳定，统一传 0/1
    isAc: params.isAc ? 1 : 0,
    ...(params.userId !== undefined ? { userId: params.userId } : {}),
  })
  if (!res.success) return { ...res, data: [] }
  const list = Array.isArray(res.data) ? res.data : []
  return {
    ...res,
    data: list.map((item) => ({
      // 统一成 YYYY-MM-DD，避免洞察/趋势按本地日匹配失败
      date: ymdToDateKey(str(item.date)),
      count: num(item.count),
    })),
  }
}
