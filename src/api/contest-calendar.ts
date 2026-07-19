import {
  endpoints,
  type ContestCalendarItem,
  type ContestCalendarPlatform,
  type ContestCalendarSub,
} from '@shared/api'
import { get, num, post, str, type ApiResult } from '@/lib/http'

export interface ContestCalendarListData {
  list: ContestCalendarItem[]
  total: number
}

function normalizeItem(raw: Record<string, unknown>): ContestCalendarItem {
  return {
    id: num(raw.id),
    platform: str(raw.platform),
    platformName: str(raw.platformName),
    externalId: str(raw.externalId),
    name: str(raw.name),
    url: str(raw.url),
    startTime: num(raw.startTime),
    endTime: num(raw.endTime),
    source: str(raw.source),
    iconUrl: str(raw.iconUrl),
    subscribed: Boolean(raw.subscribed),
  }
}

function normalizePlatform(raw: Record<string, unknown>): ContestCalendarPlatform {
  return {
    platform: str(raw.platform),
    platformName: str(raw.platformName),
    iconUrl: str(raw.iconUrl),
    count: num(raw.count),
  }
}

function normalizeSub(raw: Record<string, unknown>): ContestCalendarSub {
  return {
    id: num(raw.id),
    scope: str(raw.scope),
    platform: str(raw.platform),
    calendarId: num(raw.calendarId),
    advanceMinutes: num(raw.advanceMinutes, 360), // CONTEST_CALENDAR_DEFAULT_ADVANCE
    enabled: Boolean(raw.enabled),
    contestName: str(raw.contestName) || undefined,
    contestUrl: str(raw.contestUrl) || undefined,
    startTime: num(raw.startTime) || undefined,
  }
}

export async function listContestCalendar(params?: {
  platform?: string
  keyword?: string
  status?: 'upcoming' | 'ongoing' | 'ended' | 'all'
  /** 开赛时间下界 unix 秒（含） */
  timeFrom?: number
  /** 开赛时间上界 unix 秒（含） */
  timeTo?: number
  limit?: number
  offset?: number
}): Promise<ApiResult<ContestCalendarListData>> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.contestCalendar.list, {
    platform: params?.platform || undefined,
    keyword: params?.keyword || undefined,
    status: params?.status || 'upcoming',
    ...(params?.timeFrom ? { timeFrom: params.timeFrom } : {}),
    ...(params?.timeTo ? { timeTo: params.timeTo } : {}),
    limit: params?.limit ?? 20,
    offset: params?.offset ?? 0,
  })
  if (!res.success) return { ...res, data: null }
  const list = Array.isArray(res.data) ? res.data.map(normalizeItem) : []
  const raw = (res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: { list, total: num(raw.total, list.length) },
  }
}

export async function listContestCalendarPlatforms(): Promise<
  ApiResult<ContestCalendarPlatform[]>
> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.contestCalendar.platforms, {
    upcomingOnly: true,
  })
  if (!res.success) return { ...res, data: null }
  const list = Array.isArray(res.data) ? res.data.map(normalizePlatform) : []
  return { ...res, data: list }
}

export async function getMyContestCalendarSubs(): Promise<ApiResult<ContestCalendarSub[]>> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.contestCalendar.sub)
  if (!res.success) return { ...res, data: null }
  const list = Array.isArray(res.data) ? res.data.map(normalizeSub) : []
  return { ...res, data: list }
}

export async function upsertContestCalendarSub(body: {
  scope: 'platform' | 'contest'
  platform?: string
  calendarId?: number
  advanceMinutes: number
  enabled: boolean
}): Promise<ApiResult<ContestCalendarSub>> {
  const res = await post<Record<string, unknown>>(endpoints.core.contestCalendar.sub, body)
  if (!res.success) return { ...res, data: null }
  if (res.data && typeof res.data === 'object') {
    return { ...res, data: normalizeSub(res.data as Record<string, unknown>) }
  }
  return { ...res, data: null }
}

export async function deleteContestCalendarSub(body: {
  scope: 'platform' | 'contest'
  platform?: string
  calendarId?: number
}): Promise<ApiResult<null>> {
  const res = await post(endpoints.core.contestCalendar.subDelete, body)
  return { ...res, data: null }
}
