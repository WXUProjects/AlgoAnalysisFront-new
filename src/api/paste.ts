import { endpoints, type PasteCreateReq, type PasteInfo } from '@shared/api'
import { get, post, num, str, type ApiResult } from '@/lib/http'

function normalizePaste(raw: Record<string, unknown>, withContent = true): PasteInfo {
  const expireAt = raw.expireAt
  return {
    id: num(raw.id),
    slug: str(raw.slug),
    title: str(raw.title),
    content: withContent ? str(raw.content) : undefined,
    language: str(raw.language, 'text'),
    userId: num(raw.userId),
    createdAt: num(raw.createdAt),
    expireAt:
      expireAt === null || expireAt === undefined || expireAt === ''
        ? null
        : num(expireAt),
  }
}

export async function createPaste(
  body: PasteCreateReq,
): Promise<ApiResult<PasteInfo>> {
  const res = await post<Record<string, unknown>>(endpoints.user.paste.create, body)
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const data = (raw.data ?? raw) as Record<string, unknown>
  if (!res.success || !data?.slug) {
    return {
      success: false,
      message: res.message || str(raw.message, '创建失败'),
      data: null,
    }
  }
  return {
    success: true,
    message: res.message || 'ok',
    data: normalizePaste(data, true),
    raw: res.raw,
  }
}

export async function getPaste(slug: string): Promise<ApiResult<PasteInfo>> {
  const res = await get<Record<string, unknown>>(endpoints.user.paste.get, { slug })
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const data = (raw.data ?? raw) as Record<string, unknown>
  if ((!res.success && !data?.slug) || !data?.slug) {
    return {
      success: false,
      message: res.message || str(raw.message, '获取失败'),
      data: null,
    }
  }
  return {
    success: true,
    message: res.message || 'ok',
    data: normalizePaste(data, true),
    raw: res.raw,
  }
}

export async function listMyPastes(): Promise<ApiResult<PasteInfo[]>> {
  const res = await get<Record<string, unknown>>(endpoints.user.paste.mine)
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = (Array.isArray(raw.list) ? raw.list : []) as Record<
    string,
    unknown
  >[]
  if (!res.success && !Array.isArray(raw.list)) {
    return {
      success: false,
      message: res.message || '加载失败',
      data: null,
    }
  }
  return {
    success: true,
    message: res.message || 'ok',
    data: listRaw.map((x) => normalizePaste(x, false)),
    raw: res.raw,
  }
}

export async function deletePaste(slug: string): Promise<ApiResult<unknown>> {
  return post(endpoints.user.paste.delete, { slug })
}
