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
  // 兼容 { list } / { data: [] } / { data: { list } }
  const nested =
    raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : null
  const listRaw = (
    Array.isArray(raw.list)
      ? raw.list
      : Array.isArray(res.data)
        ? res.data
        : Array.isArray(nested?.list)
          ? nested.list
          : null
  ) as Record<string, unknown>[] | null

  if (listRaw === null) {
    return {
      success: false,
      message: res.message || '加载失败',
      data: null,
      status: res.status,
      raw: res.raw,
    }
  }
  // 即使业务 code 非 0，只要解析出 list 也展示（避免把失败当成「空列表」）
  if (!res.success && listRaw.length === 0 && res.status && res.status >= 400) {
    return {
      success: false,
      message: res.message || '加载失败',
      data: null,
      status: res.status,
      raw: res.raw,
    }
  }
  return {
    success: true,
    message: res.message || 'ok',
    data: listRaw.map((x) => normalizePaste(x, false)),
    raw: res.raw,
    status: res.status,
  }
}

export async function deletePaste(slug: string): Promise<ApiResult<unknown>> {
  return post(endpoints.user.paste.delete, { slug })
}
