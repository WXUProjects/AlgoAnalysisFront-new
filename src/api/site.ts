import { endpoints, type BackupJob, type BackupScope } from '@shared/api'
import { get, post, del, str, num, type ApiResult } from '@/lib/http'
import { jwt } from '@/lib/jwt'
import { normalizeStaticUrl } from '@/lib/static-url'
import { UX_UPLOAD_FAILED, sanitizeUserMessage } from '@/lib/ux-copy'

export type { BackupJob, BackupScope }

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
  /** 超过多少天未登录视为不活跃阈值，默认 14 */
  inactiveDays: number
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
    inactiveDays: Math.max(1, Math.min(365, num(d.inactiveDays, 14) || 14)),
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
      message: str(raw.message, '加载失败，请稍后重试'),
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
  inactiveDays?: number
  setInactiveDays?: boolean
}): Promise<ApiResult<SiteConfig>> {
  const res = await post<Record<string, unknown>>(endpoints.user.site.config, body)
  if (!res.success) return { ...res, data: null }
  const raw = pickRaw(res)
  if (raw && typeof raw.code === 'number' && raw.code !== 0) {
    return {
      success: false,
      message: str(raw.message, '保存失败，请稍后重试'),
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
    message: str(raw?.message, ok ? '测试邮件已发送' : '发送失败，请稍后重试'),
    data: ok ? { success: true } : null,
  }
}

export type AccessDayStat = {
  date: string
  pv: number
  dau: number
  uv: number
  uniqueIp: number
  /** 当日新注册用户数 */
  newUsers: number
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
  return { date, pv: 0, dau: 0, uv: 0, uniqueIp: 0, newUsers: 0 }
}

function normalizeDay(raw: unknown): AccessDayStat {
  if (!raw || typeof raw !== 'object') return emptyDay()
  const d = raw as Record<string, unknown>
  // uniqueIp / newUsers：兼容 camelCase 与 snake_case
  const uniqueIp = d.uniqueIp ?? d.unique_ip
  const newUsers = d.newUsers ?? d.new_users
  return {
    date: str(d.date),
    pv: num(d.pv, 0) || 0,
    dau: num(d.dau, 0) || 0,
    uv: num(d.uv, 0) || 0,
    uniqueIp: num(uniqueIp, 0) || 0,
    newUsers: num(newUsers, 0) || 0,
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

function normalizeBackupJob(raw: unknown): BackupJob | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Record<string, unknown>
  const scopesRaw = Array.isArray(d.scopes) ? d.scopes : []
  return {
    id: num(d.id, 0) || 0,
    kind: str(d.kind),
    status: str(d.status),
    scopes: scopesRaw.map((s) => String(s)),
    progress: num(d.progress, 0) || 0,
    message: str(d.message),
    fileSize: num(d.fileSize, 0) || 0,
    createdBy: num(d.createdBy, 0) || 0,
    errorDetail: str(d.errorDetail) || undefined,
    createdAt: str(d.createdAt) || undefined,
    startedAt: str(d.startedAt) || undefined,
    finishedAt: str(d.finishedAt) || undefined,
    downloadable: Boolean(d.downloadable),
  }
}

/** 创建全站数据导出任务（后台异步） */
export async function startBackupExport(
  scopes: BackupScope[] = ['all'],
): Promise<ApiResult<{ jobId: number }>> {
  const res = await post<Record<string, unknown>>(endpoints.user.site.backup.export, {
    scopes,
  })
  if (!res.success) return { ...res, data: null }
  const raw = pickRaw(res)
  if (raw && typeof raw.code === 'number' && raw.code !== 0) {
    return { success: false, message: str(raw.message, '导出任务创建失败，请稍后重试'), data: null }
  }
  const jobId = num(raw?.jobId, 0) || 0
  if (!jobId) {
    return {
      success: false,
      message: str(raw?.message, '创建任务失败，请稍后重试'),
      data: null,
    }
  }
  return { ...res, data: { jobId } }
}

/** 上传备份包并创建导入任务（confirm 必须为 RESTORE） */
export async function startBackupImport(
  file: File,
  confirm = 'RESTORE',
): Promise<ApiResult<{ jobId: number }>> {
  const form = new FormData()
  form.append('file', file)
  form.append('confirm', confirm)
  try {
    const headers: Record<string, string> = {}
    if (jwt.isValid()) {
      headers.Authorization = `Bearer ${jwt.token}`
    }
    const res = await fetch(endpoints.user.site.backup.import, {
      method: 'POST',
      headers,
      body: form,
      credentials: 'include',
    })
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== 'object') {
      return { success: false, message: '导入响应异常', data: null }
    }
    if (typeof body.code === 'number' && body.code !== 0) {
      return {
        success: false,
        message: str(body.message, '导入任务创建失败，请稍后重试'),
        data: null,
      }
    }
    if (!res.ok) {
      return {
        success: false,
        message: str(body.message, `HTTP ${res.status}`),
        data: null,
      }
    }
    const jobId = num(body.jobId, 0) || 0
    if (!jobId) {
      return {
        success: false,
        message: str(body.message, '创建任务失败，请稍后重试'),
        data: null,
      }
    }
    return { success: true, message: str(body.message, 'ok'), data: { jobId } }
  } catch (e) {
    return {
      success: false,
      message: sanitizeUserMessage(
        e instanceof Error ? e.message : undefined,
        UX_UPLOAD_FAILED,
      ),
      data: null,
    }
  }
}

export async function getBackupJob(id: number): Promise<ApiResult<BackupJob>> {
  const res = await get<Record<string, unknown>>(endpoints.user.site.backup.job(id))
  if (!res.success) return { ...res, data: null }
  const raw = pickRaw(res)
  if (raw && typeof raw.code === 'number' && raw.code !== 0) {
    return { success: false, message: str(raw.message, '加载失败，请稍后重试'), data: null }
  }
  const job = normalizeBackupJob(raw?.job ?? raw)
  if (!job) {
    return { success: false, message: '任务信息异常，请稍后重试', data: null }
  }
  return { ...res, data: job }
}

export async function listBackupJobs(): Promise<ApiResult<BackupJob[]>> {
  const res = await get<Record<string, unknown>>(endpoints.user.site.backup.jobs)
  if (!res.success) return { ...res, data: null }
  const raw = pickRaw(res)
  if (raw && typeof raw.code === 'number' && raw.code !== 0) {
    return { success: false, message: str(raw.message, '加载失败，请稍后重试'), data: null }
  }
  const list = Array.isArray(raw?.jobs) ? raw!.jobs : []
  return {
    ...res,
    data: list.map(normalizeBackupJob).filter((j): j is BackupJob => j != null),
  }
}

export async function deleteBackupJob(id: number): Promise<ApiResult<null>> {
  const res = await del<Record<string, unknown>>(endpoints.user.site.backup.job(id))
  if (!res.success) return { ...res, data: null }
  const raw = pickRaw(res)
  if (raw && typeof raw.code === 'number' && raw.code !== 0) {
    return { success: false, message: str(raw.message, '删除失败，请稍后重试'), data: null }
  }
  return { success: true, message: 'ok', data: null }
}

/**
 * 下载导出完成的 zip：直接唤起浏览器下载。
 * 不经 JS/axios 缓冲整包（否则大文件会一直转圈）。
 * 鉴权：会话 Cookie；并带 access_token 兜底（浏览器原生下载无法设 Authorization）。
 */
export function downloadBackupJob(id: number): ApiResult<null> {
  if (!jwt.isValid()) {
    return { success: false, message: '请先登录后再下载', data: null }
  }
  const url = new URL(
    endpoints.user.site.backup.download(id),
    window.location.origin,
  )
  url.searchParams.set('access_token', jwt.token)
  // 同源 GET + 后端 Content-Disposition: attachment → 浏览器直接走系统下载栏
  const a = document.createElement('a')
  a.href = url.pathname + url.search
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  return { success: true, message: 'ok', data: null }
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
      message: str(raw.message, '加载失败，请稍后重试'),
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
