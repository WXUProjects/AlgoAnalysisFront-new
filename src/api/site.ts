import { endpoints } from '@shared/api'
import { get, post, str, num, type ApiResult } from '@/lib/http'
import { normalizeStaticUrl } from '@/lib/static-url'

export type SiteConfig = {
  siteTitle: string
  siteLogo: string
  favicon: string
  /** 页脚备案号；空则前端用默认 */
  footerIcp: string
}

export type SiteAdminConfig = SiteConfig & {
  smtpHost: string
  smtpPort: number
  smtpUsername: string
  smtpPasswordMasked: string
  smtpPasswordSet: boolean
  smtpFrom: string
  agentModel: string
  agentSecretMasked: string
  agentSecretSet: boolean
  aiAnalyzeEndpoint: string
  aiAnalyzeModel: string
  aiAnalyzeSecretMasked: string
  aiAnalyzeSecretSet: boolean
}

function normalizeBrand(raw: Record<string, unknown> | null | undefined): SiteConfig {
  const d = raw || {}
  return {
    siteTitle: str(d.siteTitle, 'GoAlgo') || 'GoAlgo',
    siteLogo: normalizeStaticUrl(str(d.siteLogo)),
    favicon: normalizeStaticUrl(str(d.favicon)),
    footerIcp: str(d.footerIcp),
  }
}

function normalizeAdmin(raw: Record<string, unknown> | null | undefined): SiteAdminConfig {
  const d = raw || {}
  return {
    ...normalizeBrand(d),
    smtpHost: str(d.smtpHost),
    smtpPort: num(d.smtpPort, 465) || 465,
    smtpUsername: str(d.smtpUsername),
    smtpPasswordMasked: str(d.smtpPasswordMasked),
    smtpPasswordSet: Boolean(d.smtpPasswordSet),
    smtpFrom: str(d.smtpFrom),
    agentModel: str(d.agentModel),
    agentSecretMasked: str(d.agentSecretMasked),
    agentSecretSet: Boolean(d.agentSecretSet),
    aiAnalyzeEndpoint: str(d.aiAnalyzeEndpoint),
    aiAnalyzeModel: str(d.aiAnalyzeModel),
    aiAnalyzeSecretMasked: str(d.aiAnalyzeSecretMasked),
    aiAnalyzeSecretSet: Boolean(d.aiAnalyzeSecretSet),
  }
}

function pickRaw(
  res: ApiResult<Record<string, unknown>>,
): Record<string, unknown> | null {
  return (
    (res.data && typeof res.data === 'object' ? res.data : null) ||
    (res.raw && typeof res.raw === 'object'
      ? (res.raw as Record<string, unknown>)
      : null)
  )
}

export async function getSiteConfig(): Promise<ApiResult<SiteConfig>> {
  const res = await get<Record<string, unknown>>(endpoints.user.site.config)
  if (!res.success) return { ...res, data: null }
  return { ...res, data: normalizeBrand(pickRaw(res)) }
}

export async function getSiteAdminConfig(): Promise<ApiResult<SiteAdminConfig>> {
  const res = await get<Record<string, unknown>>(endpoints.user.site.adminConfig)
  if (!res.success) return { ...res, data: null }
  const raw = pickRaw(res)
  // code 字段业务失败
  if (raw && typeof raw.code === 'number' && raw.code !== 0) {
    return {
      success: false,
      message: str(raw.message, '加载失败'),
      data: null,
    }
  }
  return { ...res, data: normalizeAdmin(raw) }
}

export async function updateSiteConfig(body: {
  siteTitle?: string
  siteLogo?: string
  favicon?: string
  footerIcp?: string
  smtpHost?: string
  smtpPort?: number
  smtpUsername?: string
  smtpPassword?: string
  smtpFrom?: string
  clearSmtpPassword?: boolean
  agentModel?: string
  agentSecret?: string
  clearAgentSecret?: boolean
  aiAnalyzeEndpoint?: string
  aiAnalyzeModel?: string
  aiAnalyzeSecret?: string
  clearAiAnalyzeSecret?: boolean
}): Promise<ApiResult<SiteConfig>> {
  const res = await post<Record<string, unknown>>(endpoints.user.site.config, body)
  if (!res.success) return { ...res, data: null }
  const raw = pickRaw(res)
  if (raw && typeof raw.code === 'number' && raw.code !== 0) {
    return {
      success: false,
      message: str(raw.message, '保存失败'),
      data: null,
    }
  }
  return { ...res, data: normalizeBrand(raw) }
}

export async function testSiteEmail(body: {
  to: string
  smtpHost?: string
  smtpPort?: number
  smtpUsername?: string
  smtpPassword?: string
  smtpFrom?: string
}): Promise<ApiResult<{ success: boolean }>> {
  const res = await post<Record<string, unknown>>(endpoints.user.site.testEmail, body)
  if (!res.success) return { ...res, data: null }
  const raw = pickRaw(res)
  const ok = Boolean(raw?.success) || (typeof raw?.code === 'number' && raw.code === 0)
  return {
    success: ok,
    message: str(raw?.message, ok ? '测试邮件已发送' : '发送失败'),
    data: ok ? { success: true } : null,
  }
}

export type AccessDayStat = {
  date: string
  pv: number
  dau: number
  uv: number
  uniqueIp: number
}

export type AccessPathStat = {
  path: string
  category: string
  pv: number
  share: number
}

export type AccessCategoryStat = {
  category: string
  pv: number
  share: number
}

export type AccessIpItem = {
  ip: string
  pv: number
  lastPath: string
  lastSeen: number
}

export type AccessStats = {
  today: AccessDayStat
  yesterday: AccessDayStat
  series: AccessDayStat[]
  clientIpAvailable: boolean
  totalPv: number
  totalDauSum: number
  topPaths: AccessPathStat[]
  categories: AccessCategoryStat[]
  ips: AccessIpItem[]
  metricNote: string
  registeredUsers: number
  mau: number
  apiRequestsToday: number
  apiPeakConcurrent: number
  apiInflight: number
  spiderEnqueuedToday: number
  spiderOkToday: number
  spiderFailToday: number
  spiderRowsToday: number
}

function emptyDay(date = ''): AccessDayStat {
  return { date, pv: 0, dau: 0, uv: 0, uniqueIp: 0 }
}

function normalizeDay(raw: unknown): AccessDayStat {
  if (!raw || typeof raw !== 'object') return emptyDay()
  const d = raw as Record<string, unknown>
  return {
    date: str(d.date),
    pv: num(d.pv, 0) || 0,
    dau: num(d.dau, 0) || 0,
    uv: num(d.uv, 0) || 0,
    uniqueIp: num(d.uniqueIp, 0) || 0,
  }
}

function normalizePath(raw: unknown): AccessPathStat {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    path: str(d.path, '/'),
    category: str(d.category, '其他'),
    pv: num(d.pv, 0) || 0,
    share: Number(d.share) || 0,
  }
}

function normalizeCat(raw: unknown): AccessCategoryStat {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    category: str(d.category, '其他'),
    pv: num(d.pv, 0) || 0,
    share: Number(d.share) || 0,
  }
}

function normalizeIp(raw: unknown): AccessIpItem {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    ip: str(d.ip),
    pv: num(d.pv, 0) || 0,
    lastPath: str(d.lastPath),
    lastSeen: num(d.lastSeen, 0) || 0,
  }
}

/** 页面访问上报（公开；有 token 时计入日活） */
export async function visitPing(path: string, visitorId: string): Promise<ApiResult<{ counted: boolean }>> {
  const res = await post<Record<string, unknown>>(endpoints.user.site.visitPing, {
    path,
    visitorId,
  })
  if (!res.success) return { ...res, data: null }
  const raw = pickRaw(res)
  return {
    ...res,
    data: { counted: Boolean(raw?.counted) },
  }
}

/** 站点访问概览（仅站点管理员） */
export async function getAccessStats(days = 30): Promise<ApiResult<AccessStats>> {
  const res = await get<Record<string, unknown>>(
    `${endpoints.user.site.accessStats}?days=${days}`,
  )
  if (!res.success) return { ...res, data: null }
  const raw = pickRaw(res)
  if (raw && typeof raw.code === 'number' && raw.code !== 0) {
    return {
      success: false,
      message: str(raw.message, '加载失败'),
      data: null,
    }
  }
  const seriesRaw = Array.isArray(raw?.series) ? raw!.series : []
  const pathsRaw = Array.isArray(raw?.topPaths) ? raw!.topPaths : []
  const catsRaw = Array.isArray(raw?.categories) ? raw!.categories : []
  const ipsRaw = Array.isArray(raw?.ips) ? raw!.ips : []
  return {
    ...res,
    data: {
      today: normalizeDay(raw?.today),
      yesterday: normalizeDay(raw?.yesterday),
      series: seriesRaw.map(normalizeDay),
      clientIpAvailable: Boolean(raw?.clientIpAvailable),
      totalPv: num(raw?.totalPv, 0) || 0,
      totalDauSum: num(raw?.totalDauSum, 0) || 0,
      topPaths: pathsRaw.map(normalizePath),
      categories: catsRaw.map(normalizeCat),
      ips: ipsRaw.map(normalizeIp),
      metricNote: str(raw?.metricNote),
      registeredUsers: num(raw?.registeredUsers, 0) || 0,
      mau: num(raw?.mau, 0) || 0,
      apiRequestsToday: num(raw?.apiRequestsToday, 0) || 0,
      apiPeakConcurrent: num(raw?.apiPeakConcurrent, 0) || 0,
      apiInflight: num(raw?.apiInflight, 0) || 0,
      spiderEnqueuedToday: num(raw?.spiderEnqueuedToday, 0) || 0,
      spiderOkToday: num(raw?.spiderOkToday, 0) || 0,
      spiderFailToday: num(raw?.spiderFailToday, 0) || 0,
      spiderRowsToday: num(raw?.spiderRowsToday, 0) || 0,
    },
  }
}
