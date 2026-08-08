import { endpoints, type Platform, type RefreshSpiderRes } from '@shared/api'
import { post, num, str, type ApiResult } from '@/lib/http'

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
