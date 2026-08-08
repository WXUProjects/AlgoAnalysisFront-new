import { endpoints } from '@shared/api'
import type { SpiderMonitorRes, PlatformUsersRes } from '@shared/api'
import { get, post, num, str, bool, type ApiResult } from '@/lib/http'

export interface SubmitInventory {
  submitLogsTotal: number
  submitLogsRealTotal: number
  oldestTime: number
  newestTime: number
}

export type SpiderPlatformStat = SpiderMonitorRes['platforms'][number]

export async function getSpiderMonitor(): Promise<ApiResult<SpiderPlatformStat[]>> {
  const res = await get<Record<string, unknown>>(endpoints.core.spider.monitor)
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  const list = Array.isArray(raw.platforms) ? (raw.platforms as Record<string, unknown>[]) : []
  return {
    ...res,
    data: list.map((p) => ({
      platform: str(p.platform),
      boundUsers: num(p.boundUsers, 0),
      submitCount: num(p.submitCount, 0),
      todayEnqueued: num(p.todayEnqueued, 0),
      todayRows: num(p.todayRows, 0),
      todayOk: num(p.todayOk, 0),
      todayFail: num(p.todayFail, 0),
      lastOkAt: num(p.lastOkAt, 0),
      lastFailAt: num(p.lastFailAt, 0),
      lastError: str(p.lastError),
      problemCount: num(p.problemCount, 0),
      contestCount: num(p.contestCount, 0),
      hasSubmitFetcher: bool(p.hasSubmitFetcher),
      hasProblemFetch: bool(p.hasProblemFetch),
      hasContestCalendar: bool(p.hasContestCalendar),
      hasAccount: bool(p.hasAccount),
      accountStatus: str(p.accountStatus),
      accountAt: num(p.accountAt, 0),
      accountErr: str(p.accountErr),
      paused: bool(p.paused),
    })),
  }
}

export async function togglePlatformSync(
  platform: string,
  enabled: boolean,
): Promise<ApiResult<unknown>> {
  return post(endpoints.core.spider.togglePlatform, { platform, enabled })
}

/** 站管：某 OJ 的绑定用户列表 */
export async function getPlatformUsers(
  platform: string,
  offset = 0,
  limit = 100,
): Promise<ApiResult<PlatformUsersRes>> {
  const res = await get<Record<string, unknown>>(
    endpoints.core.spider.platformUsers,
    { platform, offset, limit },
  )
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  const list = Array.isArray(raw.list) ? (raw.list as Record<string, unknown>[]) : []
  return {
    ...res,
    data: {
      code: num(raw.code),
      message: str(raw.message),
      total: num(raw.total),
      list: list.map((u) => ({
        userId: num(u.userId),
        name: str(u.name),
        username: str(u.username),
        ojUsername: str(u.ojUsername),
        rating: num(u.rating),
        hasRating: bool(u.hasRating),
      })),
    },
  }
}

export async function getSubmitInventory(): Promise<ApiResult<SubmitInventory>> {
  const res = await get<Record<string, unknown>>(
    endpoints.core.spider.submitInventory,
  )
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      submitLogsTotal: num(raw.submitLogsTotal),
      submitLogsRealTotal: num(raw.submitLogsRealTotal),
      oldestTime: num(raw.oldestTime),
      newestTime: num(raw.newestTime),
    },
  }
}

export interface PurgeSubmitsResult {
  deletedSubmitLogs: number
  deletedDaily: number
  deletedAc: number
  enqueuedUsers: number
  message: string
}

/** confirm 必须为 PURGE_SUBMITS */
export async function purgeSubmitsAndRecrawl(
  confirm: string,
): Promise<ApiResult<PurgeSubmitsResult>> {
  const res = await post<Record<string, unknown>>(
    endpoints.core.spider.purgeSubmitsAndRecrawl,
    { confirm },
  )
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      deletedSubmitLogs: num(raw.deletedSubmitLogs),
      deletedDaily: num(raw.deletedDaily),
      deletedAc: num(raw.deletedAc),
      enqueuedUsers: num(raw.enqueuedUsers),
      message: str(raw.message, res.message),
    },
    message: str(raw.message, res.message),
  }
}
