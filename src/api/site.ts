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
