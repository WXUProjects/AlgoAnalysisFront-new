import { endpoints } from '@shared/api'
import { get, num, str, type ApiResult } from '@/lib/http'

export type HealthServiceItem = {
  name: string
  status: string
  at: number
  errMsg: string
}

export type HealthMiddlewareItem = {
  name: string
  status: string
  latencyMs: number
  errMsg: string
}

export type HealthResourceItem = {
  name: string
  status: string
  usedPercent: number
  used: number
  total: number
  detail: string
}

export type HealthApiItem = {
  requestsToday: number
  concurrentNow: number
  peakConcurrentToday: number
  latencyAvgMs: number
  latencyP50Ms: number
  latencyP95Ms: number
  latencyP99Ms: number
  spiderEnqueuedToday: number
  spiderOkToday: number
  spiderFailToday: number
}

export type HealthCapacityItem = {
  registeredUsers: number
  mau: number
  todayUv: number
  todayPv: number
  storageUsed: number
  storageTotal: number
  peakUsers: number
  healthyUsers: number
  loadLevel: string
  loadNote: string
}

export type HealthOverview = {
  services: HealthServiceItem[]
  middleware: HealthMiddlewareItem[]
  resources: HealthResourceItem[]
  api: HealthApiItem
  capacity: HealthCapacityItem
  collectedAt: number
}

/** 近 24h CPU/内存占用时序采样点 */
export type ResourceSample = {
  /** unix 秒 */
  t: number
  /** CPU 占用 % 0-100 */
  cpu: number
  /** 内存占用 % 0-100 */
  mem: number
}

export type ResourceSeries = {
  samples: ResourceSample[]
  intervalSec: number
  hours: number
}

function listOf(raw: unknown): Record<string, unknown>[] {
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []
}

/** 近 24h CPU/内存占用时序（读后端缓存，服务端已降采样到 ~288 点） */
export async function getResourceSeries(
  points = 288,
): Promise<ApiResult<ResourceSeries>> {
  const res = await get<Record<string, unknown>>(
    `${endpoints.core.health.resourceSeries}?points=${points}`,
  )
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  if (typeof raw.code === 'number' && raw.code !== 0) {
    return {
      success: false,
      message: str(raw.message, '资源时序没加载出来，过会儿再试'),
      data: null,
    }
  }
  const samples = listOf(raw.samples).map((s) => ({
    t: num(s.t, 0),
    cpu: Number(s.cpu) || 0,
    mem: Number(s.mem) || 0,
  }))
  return {
    ...res,
    data: {
      samples,
      intervalSec: num(raw.intervalSec, 25),
      hours: Number(raw.hours) || 0,
    },
  }
}

export async function getHealthOverview(): Promise<ApiResult<HealthOverview>> {
  const res = await get<Record<string, unknown>>(endpoints.core.health.overview)
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  const apiRaw = (raw.api && typeof raw.api === 'object' ? raw.api : {}) as Record<string, unknown>
  const capRaw = (raw.capacity && typeof raw.capacity === 'object' ? raw.capacity : {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      services: listOf(raw.services).map((s) => ({
        name: str(s.name),
        status: str(s.status, 'unchecked'),
        at: num(s.at, 0),
        errMsg: str(s.errMsg),
      })),
      middleware: listOf(raw.middleware).map((m) => ({
        name: str(m.name),
        status: str(m.status, 'fail'),
        latencyMs: num(m.latencyMs, 0),
        errMsg: str(m.errMsg),
      })),
      resources: listOf(raw.resources).map((r) => ({
        name: str(r.name),
        status: str(r.status, 'ok'),
        usedPercent: Number(r.usedPercent) || 0,
        used: num(r.used, 0),
        total: num(r.total, 0),
        detail: str(r.detail),
      })),
      api: {
        requestsToday: num(apiRaw.requestsToday, 0),
        concurrentNow: num(apiRaw.concurrentNow, 0),
        peakConcurrentToday: num(apiRaw.peakConcurrentToday, 0),
        latencyAvgMs: num(apiRaw.latencyAvgMs, 0),
        latencyP50Ms: num(apiRaw.latencyP50Ms, 0),
        latencyP95Ms: num(apiRaw.latencyP95Ms, 0),
        latencyP99Ms: num(apiRaw.latencyP99Ms, 0),
        spiderEnqueuedToday: num(apiRaw.spiderEnqueuedToday, 0),
        spiderOkToday: num(apiRaw.spiderOkToday, 0),
        spiderFailToday: num(apiRaw.spiderFailToday, 0),
      },
      capacity: {
        registeredUsers: num(capRaw.registeredUsers, 0),
        mau: num(capRaw.mau, 0),
        todayUv: num(capRaw.todayUv, 0),
        todayPv: num(capRaw.todayPv, 0),
        storageUsed: num(capRaw.storageUsed, 0),
        storageTotal: num(capRaw.storageTotal, 0),
        peakUsers: num(capRaw.peakUsers, 0),
        healthyUsers: num(capRaw.healthyUsers, 0),
        loadLevel: str(capRaw.loadLevel, 'low'),
        loadNote: str(capRaw.loadNote),
      },
      collectedAt: num(raw.collectedAt, 0),
    },
  }
}
