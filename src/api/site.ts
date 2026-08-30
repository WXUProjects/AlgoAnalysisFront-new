import { endpoints, type SiteConfigSection } from '@shared/api'
import { get, post, str, num, type ApiResult } from '@/lib/http'
import { normalizeStaticUrl } from '@/lib/static-url'

export type { SiteConfigSection }

export type SiteConfig = {
  siteTitle: string
  siteLogo: string
  favicon: string
  /** 页脚备案号；空则前端用默认 */
  footerIcp: string
  /** 支付是否已完整配置（接口根地址 + 商户号 + 接入密钥齐备） */
  payfmConfigured: boolean
}

export type SiteAdminConfig = SiteConfig & {
  backupEnabled: boolean
  backupTime: string
  backupPrefix: string
  smtpHost: string
  smtpPort: number
  smtpUsername: string
  smtpPasswordMasked: string
  smtpPasswordSet: boolean
  smtpFrom: string
  agentModel: string
  /** 日报/周报 OpenAI 兼容服务地址（非敏感） */
  agentEndpoint: string
  agentSecretMasked: string
  agentSecretSet: boolean
  /** 配置乐观并发版本（每次更新 +1） */
  configVersion: number
  aiAnalyzeEndpoint: string
  aiAnalyzeModel: string
  aiAnalyzeSecretMasked: string
  aiAnalyzeSecretSet: boolean
  /** 超过多少天未登录视为不活跃阈值，默认 14 */
  inactiveDays: number
  /** 审核/举报邮件收件人（逗号或换行）；空则发给全部站管账号邮箱 */
  adminNotifyEmails: string
  /** 运维告警邮件收件人（逗号或换行）；空则运维告警不发邮件 */
  opsNotifyEmails: string
  /** 运维磁盘统计目录（数据盘挂载点；空=默认 /data） */
  dataDiskPath: string
  spiderConcurrency: number
  problemAnalyzeConcurrency: number
  /** 又拍云图床 */
  upyunBucket: string
  upyunOperator: string
  upyunPasswordMasked: string
  upyunPasswordSet: boolean
  upyunDomain: string
  /** http | https */
  upyunScheme: string
  /** OJ 爬虫账号 */
  ojLuoguUsername: string
  ojLuoguPasswordMasked: string
  ojLuoguPasswordSet: boolean
  ojQojUsername: string
  ojQojPasswordMasked: string
  ojQojPasswordSet: boolean
  ojVjudgeUsername: string
  ojVjudgePasswordMasked: string
  ojVjudgePasswordSet: boolean
  ojVjudgeStatus: string
  ojVjudgeStatusAt: number
  ojVjudgeErrMsg: string
  /** 支付FM（聚合支付；https://docs.zhifux.com） */
  payfmApiBase: string
  payfmMerchantNo: string
  payfmSecretMasked: string
  payfmSecretSet: boolean
  /** 支付方式（如 aloop=支付宝轮循池；空=默认 aloop） */
  payfmPayType: string
  /** 回调地址（展示用） */
  payfmNotifyUrl: string
  ojLuoguStatus: string
  ojLuoguStatusAt: number
  ojLuoguErrMsg: string
  ojQojStatus: string
  ojQojStatusAt: number
  ojQojErrMsg: string
  agentStatus: string
  agentStatusAt: number
  agentErrMsg: string
  aiAnalyzeStatus: string
  aiAnalyzeStatusAt: number
  aiAnalyzeErrMsg: string
  smtpStatus: string
  smtpStatusAt: number
  smtpErrMsg: string
}

function normalizeBrand(raw: Record<string, unknown> | null | undefined): SiteConfig {
  const d = raw || {}
  return {
    siteTitle: str(d.siteTitle, 'GoAlgo') || 'GoAlgo',
    siteLogo: normalizeStaticUrl(str(d.siteLogo)),
    favicon: normalizeStaticUrl(str(d.favicon)),
    footerIcp: str(d.footerIcp),
    payfmConfigured: Boolean(d.payfmConfigured),
  }
}

function normalizeAdmin(raw: Record<string, unknown> | null | undefined): SiteAdminConfig {
  const d = raw || {}
  return {
    ...normalizeBrand(d),
    backupEnabled: Boolean(d.backupEnabled),
    backupTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(str(d.backupTime)) ? str(d.backupTime) : '02:00',
    backupPrefix: str(d.backupPrefix),
    smtpHost: str(d.smtpHost),
    smtpPort: num(d.smtpPort, 465) || 465,
    smtpUsername: str(d.smtpUsername),
    smtpPasswordMasked: str(d.smtpPasswordMasked),
    smtpPasswordSet: Boolean(d.smtpPasswordSet),
    smtpFrom: str(d.smtpFrom),
    agentModel: str(d.agentModel),
    agentEndpoint: str(d.agentEndpoint),
    agentSecretMasked: str(d.agentSecretMasked),
    agentSecretSet: Boolean(d.agentSecretSet),
    configVersion: num(d.configVersion, 0),
    aiAnalyzeEndpoint: str(d.aiAnalyzeEndpoint),
    aiAnalyzeModel: str(d.aiAnalyzeModel),
    aiAnalyzeSecretMasked: str(d.aiAnalyzeSecretMasked),
    aiAnalyzeSecretSet: Boolean(d.aiAnalyzeSecretSet),
    inactiveDays: Math.max(1, Math.min(365, num(d.inactiveDays, 14) || 14)),
    adminNotifyEmails: str(d.adminNotifyEmails),
    opsNotifyEmails: str(d.opsNotifyEmails),
    dataDiskPath: str(d.dataDiskPath),
    spiderConcurrency: Math.max(1, Math.min(32, num(d.spiderConcurrency, 4) || 4)),
    problemAnalyzeConcurrency: Math.max(1, Math.min(32, num(d.problemAnalyzeConcurrency, 4) || 4)),
    upyunBucket: str(d.upyunBucket),
    upyunOperator: str(d.upyunOperator),
    upyunPasswordMasked: str(d.upyunPasswordMasked),
    upyunPasswordSet: Boolean(d.upyunPasswordSet),
    upyunDomain: str(d.upyunDomain),
    upyunScheme: str(d.upyunScheme) || 'http',
    ojLuoguUsername: str(d.ojLuoguUsername),
    ojLuoguPasswordMasked: str(d.ojLuoguPasswordMasked),
    ojLuoguPasswordSet: Boolean(d.ojLuoguPasswordSet),
    ojQojUsername: str(d.ojQojUsername),
    ojQojPasswordMasked: str(d.ojQojPasswordMasked),
    ojQojPasswordSet: Boolean(d.ojQojPasswordSet),
    ojVjudgeUsername: str(d.ojVjudgeUsername),
    ojVjudgePasswordMasked: str(d.ojVjudgePasswordMasked),
    ojVjudgePasswordSet: Boolean(d.ojVjudgePasswordSet),
    ojVjudgeStatus: str(d.ojVjudgeStatus, 'unchecked'),
    ojVjudgeStatusAt: num(d.ojVjudgeStatusAt, 0),
    ojVjudgeErrMsg: str(d.ojVjudgeErrMsg),
    ojLuoguStatus: str(d.ojLuoguStatus, 'unchecked'),
    ojLuoguStatusAt: num(d.ojLuoguStatusAt, 0),
    ojLuoguErrMsg: str(d.ojLuoguErrMsg),
    ojQojStatus: str(d.ojQojStatus, 'unchecked'),
    ojQojStatusAt: num(d.ojQojStatusAt, 0),
    ojQojErrMsg: str(d.ojQojErrMsg),
    payfmApiBase: str(d.payfmApiBase),
    payfmMerchantNo: str(d.payfmMerchantNo),
    payfmSecretMasked: str(d.payfmSecretMasked),
    payfmSecretSet: Boolean(d.payfmSecretSet),
    payfmPayType: str(d.payfmPayType),
    payfmNotifyUrl: str(d.payfmNotifyUrl),
    agentStatus: str(d.agentStatus, 'unchecked'),
    agentStatusAt: num(d.agentStatusAt, 0),
    agentErrMsg: str(d.agentErrMsg),
    aiAnalyzeStatus: str(d.aiAnalyzeStatus, 'unchecked'),
    aiAnalyzeStatusAt: num(d.aiAnalyzeStatusAt, 0),
    aiAnalyzeErrMsg: str(d.aiAnalyzeErrMsg),
    smtpStatus: str(d.smtpStatus, 'unchecked'),
    smtpStatusAt: num(d.smtpStatusAt, 0),
    smtpErrMsg: str(d.smtpErrMsg),
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
      message: str(raw.message, '没加载出来，过会儿再试'),
      data: null,
    }
  }
  return { ...res, data: normalizeAdmin(raw) }
}

export async function updateSiteConfig(body: {
  /** 保存分区：basic | email | ai | upyun | oj | payment | backup | ops | all（缺省 all） */
  section?: SiteConfigSection
  /** 期望的 config_version；>0 校验，不匹配返回 409 */
  expectedConfigVersion?: number
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
  agentEndpoint?: string
  agentModel?: string
  agentSecret?: string
  clearAgentSecret?: boolean
  aiAnalyzeEndpoint?: string
  aiAnalyzeModel?: string
  aiAnalyzeSecret?: string
  clearAiAnalyzeSecret?: boolean
  inactiveDays?: number
  setInactiveDays?: boolean
  /** 审核/举报邮件收件人；可传空串清空 */
  adminNotifyEmails?: string
  /** 运维告警邮件收件人；可传空串清空 */
  opsNotifyEmails?: string
  /** 运维磁盘统计目录（数据盘挂载点）；可传空串恢复默认 /data */
  dataDiskPath?: string
  upyunBucket?: string
  upyunOperator?: string
  upyunPassword?: string
  clearUpyunPassword?: boolean
  upyunDomain?: string
  upyunScheme?: string
  ojLuoguUsername?: string
  ojLuoguPassword?: string
  clearOjLuoguPassword?: boolean
  ojQojUsername?: string
  ojQojPassword?: string
  clearOjQojPassword?: boolean
  ojVjudgeUsername?: string
  ojVjudgePassword?: string
  clearOjVjudgePassword?: boolean
  payfmApiBase?: string
  payfmMerchantNo?: string
  payfmSecret?: string
  clearPayfmSecret?: boolean
  payfmPayType?: string
  backupEnabled?: boolean
  /** 每日执行时间，HH:mm */
  backupTime?: string
  /** 灾备对象所在目录；空表示桶根固定对象 algobak */
  backupPrefix?: string
  spiderConcurrency?: number
  problemAnalyzeConcurrency?: number
}): Promise<ApiResult<SiteConfig>> {
  const res = await post<Record<string, unknown>>(endpoints.user.site.config, body)
  if (!res.success) return { ...res, data: null }
  const raw = pickRaw(res)
  if (raw && typeof raw.code === 'number' && raw.code !== 0) {
    return {
      success: false,
      message: str(raw.message, '没保存上，过会儿再试'),
      data: null,
    }
  }
  return { ...res, data: normalizeBrand(raw) }
}

export type VerifyOjResult = {
  ok: boolean
  message: string
  errorDetail: string
}

export async function verifyOjCredential(body: {
  platform: string
  username?: string
  password?: string
}): Promise<ApiResult<VerifyOjResult>> {
  const res = await post<Record<string, unknown>>(endpoints.user.site.verifyOj, body, {
    skipAuthExpired: true,
  })
  const raw = pickRaw(res)
  const ok = Boolean(raw?.ok)
  const msg = str(raw?.message, res.message)
  const detail = str(raw?.errorDetail)
  return {
    success: ok || (typeof raw?.code === 'number' && raw.code === 0),
    message: detail || msg || (ok ? '验证通过' : '验证失败'),
    data: { ok, message: msg, errorDetail: detail },
  }
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
    message: str(raw?.message, ok ? '测试邮件已发送' : '没发出去，过会儿再试'),
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
      message: str(raw.message, '没加载出来，过会儿再试'),
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
