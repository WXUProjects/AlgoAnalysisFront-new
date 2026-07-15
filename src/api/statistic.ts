import {
  endpoints,
  type HeatmapItem,
  type PeriodData,
  type PeriodItem,
} from '@shared/api'
import { get, num, str, type ApiResult } from '@/lib/http'

function normalizePeriodItem(raw: Record<string, unknown> | undefined): PeriodItem {
  const r = raw ?? {}
  return {
    today: num(r.today),
    thisWeek: num(r.thisWeek),
    lastWeek: num(r.lastWeek),
    thisMonth: num(r.thisMonth),
    lastMonth: num(r.lastMonth),
    thisYear: num(r.thisYear),
    lastYear: num(r.lastYear),
    total: num(r.total),
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
