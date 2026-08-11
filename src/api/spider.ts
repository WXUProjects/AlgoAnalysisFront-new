import {
  endpoints,
  type Platform,
  type RefreshSpiderRes,
  type RefreshSpiderStatusRes,
} from '@shared/api'
import { post, get, num, str, type ApiResult } from '@/lib/http'

export async function setSpider(body: {
  userId: number
  platform: Platform | string
  username: string
}): Promise<ApiResult<unknown>> {
  return post(endpoints.core.spider.set, body)
}

export async function updateSpider(userId: number): Promise<ApiResult<unknown>> {
  return post(endpoints.core.spider.update, { userId })
}

export async function updateAllSpiders(): Promise<ApiResult<unknown>> {
  return post(endpoints.core.spider.updateAll, {})
}

/** 手动增量刷新自己的 OJ 做题记录（每日限 2 次）；返回剩余次数与提示 */
export async function refreshSpider(): Promise<ApiResult<RefreshSpiderRes>> {
  const res = await post<Record<string, unknown>>(endpoints.core.spider.refresh, {})
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      code: num(raw.code),
      message: str(raw.message),
      remaining: num(raw.remaining),
    },
  }
}

/** 今日手动刷新做题记录状态（配额/剩余/冷却/生效同步间隔；只读） */
export async function getRefreshStatus(): Promise<ApiResult<RefreshSpiderStatusRes>> {
  return requestRefreshStatus()
}

/** 站点管理员：查任意用户的今日手动刷新状态与生效同步间隔（传 userId） */
export async function getAdminRefreshStatus(
  userId: number,
): Promise<ApiResult<RefreshSpiderStatusRes>> {
  return requestRefreshStatus(userId)
}

async function requestRefreshStatus(
  userId?: number,
): Promise<ApiResult<RefreshSpiderStatusRes>> {
  const res = await get<Record<string, unknown>>(
    endpoints.core.spider.refreshStatus,
    userId && userId > 0 ? { userId } : {},
  )
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      code: num(raw.code),
      message: str(raw.message),
      limit: num(raw.limit),
      remaining: num(raw.remaining),
      nextAvailableAt: num(raw.nextAvailableAt),
      syncIntervalMin: num(raw.syncIntervalMin),
    },
  }
}
