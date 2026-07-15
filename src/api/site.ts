import { endpoints } from '@shared/api'
import { get, post, str, type ApiResult } from '@/lib/http'

export type SiteConfig = {
  siteTitle: string
  siteLogo: string
  favicon: string
}

function normalize(raw: Record<string, unknown> | null | undefined): SiteConfig {
  const d = raw || {}
  return {
    siteTitle: str(d.siteTitle, 'Algo-CWUX') || 'Algo-CWUX',
    siteLogo: str(d.siteLogo),
    favicon: str(d.favicon),
  }
}

export async function getSiteConfig(): Promise<ApiResult<SiteConfig>> {
  const res = await get<Record<string, unknown>>(endpoints.user.site.config)
  if (!res.success) return { ...res, data: null }
  const raw =
    (res.data && typeof res.data === 'object' ? res.data : null) ||
    (res.raw && typeof res.raw === 'object' ? (res.raw as Record<string, unknown>) : null)
  return { ...res, data: normalize(raw) }
}

export async function updateSiteConfig(body: {
  siteTitle?: string
  siteLogo?: string
  favicon?: string
}): Promise<ApiResult<SiteConfig>> {
  const res = await post<Record<string, unknown>>(endpoints.user.site.config, body)
  if (!res.success) return { ...res, data: null }
  const raw =
    (res.data && typeof res.data === 'object' ? res.data : null) ||
    (res.raw && typeof res.raw === 'object' ? (res.raw as Record<string, unknown>) : null)
  return { ...res, data: normalize(raw) }
}
