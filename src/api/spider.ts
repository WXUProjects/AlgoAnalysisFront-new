import { endpoints, type Platform } from '@shared/api'
import { post, type ApiResult } from '@/lib/http'

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
