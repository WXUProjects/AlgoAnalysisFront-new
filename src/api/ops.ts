import { endpoints } from '@shared/api'
import { get, post, num, str, type ApiResult } from '@/lib/http'

export interface SubmitInventory {
  submitLogsTotal: number
  submitLogsRealTotal: number
  countedSubmitIdsTotal: number
  oldestTime: number
  newestTime: number
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
      countedSubmitIdsTotal: num(raw.countedSubmitIdsTotal),
      oldestTime: num(raw.oldestTime),
      newestTime: num(raw.newestTime),
    },
  }
}

export interface PurgeSubmitsResult {
  deletedSubmitLogs: number
  deletedLedger: number
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
      deletedLedger: num(raw.deletedLedger),
      deletedDaily: num(raw.deletedDaily),
      deletedAc: num(raw.deletedAc),
      enqueuedUsers: num(raw.enqueuedUsers),
      message: str(raw.message, res.message),
    },
    message: str(raw.message, res.message),
  }
}
