import {
  endpoints,
  type AddManualProblemsetItemReq,
  type AddProblemsetItemReq,
  type CreateProblemsetReq,
  type ProblemsetInfo,
  type ProblemsetItemInfo,
  type UpdateProblemsetReq,
} from '@shared/api'
import { get, post, num, str, bool, type ApiResult } from '@/lib/http'

function normalizeItem(raw: Record<string, unknown>): ProblemsetItemInfo {
  return {
    id: num(raw.id),
    problemId: num(raw.problemId),
    sortOrder: num(raw.sortOrder),
    createdAt: num(raw.createdAt),
    title: str(raw.title),
    platform: str(raw.platform),
    externalId: str(raw.externalId),
    url: str(raw.url),
    difficulty: str(raw.difficulty),
    status: str(raw.status),
    userStatus: str(raw.userStatus),
  }
}

function normalizeSet(raw: Record<string, unknown>): ProblemsetInfo {
  const items = Array.isArray(raw.items)
    ? (raw.items as Record<string, unknown>[]).map(normalizeItem)
    : undefined
  const hasContains = Object.prototype.hasOwnProperty.call(raw, 'containsProblem')
  return {
    id: num(raw.id),
    ownerId: num(raw.ownerId),
    ownerName: str(raw.ownerName) || undefined,
    title: str(raw.title),
    description: str(raw.description),
    kind: str(raw.kind, 'custom'),
    visibility: str(raw.visibility, 'private'),
    likeCount: num(raw.likeCount),
    itemCount: num(raw.itemCount),
    liked: bool(raw.liked),
    favorited: bool(raw.favorited),
    isOwner: bool(raw.isOwner),
    isSystem: bool(raw.isSystem),
    containsProblem: hasContains ? bool(raw.containsProblem) : undefined,
    createdAt: num(raw.createdAt),
    updatedAt: num(raw.updatedAt),
    locked: bool(raw.locked),
    items,
  }
}

export async function listMyProblemsets(params?: {
  /** 传入时每项带 containsProblem，表示该题是否已在题单中 */
  problemId?: number | string
}): Promise<ApiResult<ProblemsetInfo[]>> {
  const res = await get<unknown>(endpoints.core.problemset.mine, {
    problemId: params?.problemId || undefined,
  })
  if (!res.success) {
    return { success: false, message: res.message, data: null, status: res.status }
  }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const list = Array.isArray(res.data)
    ? (res.data as Record<string, unknown>[])
    : Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>[])
      : []
  return { success: true, message: 'ok', data: list.map(normalizeSet), raw: res.raw }
}

export async function listSquareProblemsets(params?: {
  page?: number
  pageSize?: number
  keyword?: string
}): Promise<ApiResult<{ list: ProblemsetInfo[]; total: number; page: number; pageSize: number }>> {
  const res = await get<unknown>(endpoints.core.problemset.square, {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    keyword: params?.keyword || undefined,
  })
  const raw = (res.raw ?? {}) as Record<string, unknown>
  if (!res.success) {
    return { success: false, message: res.message, data: null, status: res.status }
  }
  const list = Array.isArray(res.data)
    ? (res.data as Record<string, unknown>[])
    : Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>[])
      : []
  return {
    success: true,
    message: 'ok',
    data: {
      list: list.map(normalizeSet),
      total: num(raw.total),
      page: num(raw.page, 1),
      pageSize: num(raw.pageSize, 20),
    },
    raw: res.raw,
  }
}

export async function getProblemset(
  id: number | string,
  unlockToken?: string,
): Promise<ApiResult<ProblemsetInfo>> {
  const res = await get<unknown>(endpoints.core.problemset.get, {
    id,
    unlockToken: unlockToken || undefined,
  })
  const raw = (res.raw ?? {}) as Record<string, unknown>
  // 密码保护：403 + code PASSWORD_REQUIRED
  if (!res.success) {
    const code = str(raw.code)
    const dataRaw = (raw.data ?? {}) as Record<string, unknown>
    if (code === 'PASSWORD_REQUIRED' || str(raw.message).includes('密码')) {
      return {
        success: false,
        message: res.message || '需要密码',
        data: dataRaw.id ? normalizeSet({ ...dataRaw, locked: true }) : null,
        raw: res.raw,
        status: res.status,
      }
    }
    return { success: false, message: res.message, data: null, status: res.status }
  }
  const data = (res.data ?? raw.data ?? {}) as Record<string, unknown>
  if (!data.id) {
    return { success: false, message: res.message || '加载失败', data: null }
  }
  return { success: true, message: 'ok', data: normalizeSet(data), raw: res.raw }
}

export async function listProblemsetsByProblem(
  problemId: number | string,
): Promise<ApiResult<ProblemsetInfo[]>> {
  const res = await get<unknown>(endpoints.core.problemset.byProblem, { problemId })
  if (!res.success) {
    return { success: false, message: res.message, data: null, status: res.status }
  }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const list = Array.isArray(res.data)
    ? (res.data as Record<string, unknown>[])
    : Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>[])
      : []
  return { success: true, message: 'ok', data: list.map(normalizeSet), raw: res.raw }
}

export async function createProblemset(
  body: CreateProblemsetReq,
): Promise<ApiResult<ProblemsetInfo>> {
  const res = await post<Record<string, unknown>>(endpoints.core.problemset.create, body)
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const data = (res.data ?? raw.data ?? {}) as Record<string, unknown>
  if (!res.success || !data.id) {
    return { success: false, message: res.message || '创建失败', data: null }
  }
  return { success: true, message: 'ok', data: normalizeSet(data), raw: res.raw }
}

export async function updateProblemset(
  body: UpdateProblemsetReq,
): Promise<ApiResult<ProblemsetInfo>> {
  const res = await post<Record<string, unknown>>(endpoints.core.problemset.update, body)
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const data = (res.data ?? raw.data ?? {}) as Record<string, unknown>
  if (!res.success || !data.id) {
    return { success: false, message: res.message || '更新失败', data: null }
  }
  return { success: true, message: 'ok', data: normalizeSet(data), raw: res.raw }
}

export async function deleteProblemset(id: number): Promise<ApiResult<null>> {
  const res = await post(endpoints.core.problemset.delete, { id })
  return {
    success: res.success,
    message: res.message,
    data: null,
    status: res.status,
  }
}

export async function unlockProblemset(
  id: number,
  password: string,
): Promise<ApiResult<{ unlockToken: string; expiresIn: number }>> {
  const res = await post<Record<string, unknown>>(endpoints.core.problemset.unlock, {
    id,
    password,
  })
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const data = (res.data ?? raw.data ?? {}) as Record<string, unknown>
  if (!res.success || !data.unlockToken) {
    return { success: false, message: res.message || '密码错误', data: null }
  }
  return {
    success: true,
    message: 'ok',
    data: {
      unlockToken: str(data.unlockToken),
      expiresIn: num(data.expiresIn),
    },
    raw: res.raw,
  }
}

export async function addProblemToSet(
  body: AddProblemsetItemReq,
): Promise<
  ApiResult<{
    problemId: number
    fetchTriggered: boolean
    platform?: string
    title?: string
    externalId?: string
  }> & { code?: string }
> {
  const res = await post<Record<string, unknown>>(endpoints.core.problemset.add, body)
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const data = (res.data ?? raw.data ?? {}) as Record<string, unknown>
  const code = str(raw.code) || undefined
  if (!res.success) {
    return {
      success: false,
      message: res.message || '加入失败',
      data: null,
      code,
      raw: res.raw,
    }
  }
  return {
    success: true,
    message: 'ok',
    data: {
      problemId: num(data.problemId),
      fetchTriggered: bool(data.fetchTriggered),
      platform: str(data.platform) || undefined,
      title: str(data.title) || undefined,
      externalId: str(data.externalId) || undefined,
    },
    raw: res.raw,
  }
}

export async function addManualProblemToSet(
  body: AddManualProblemsetItemReq,
): Promise<ApiResult<{ problemId: number; fetchTriggered: boolean }>> {
  const res = await post<Record<string, unknown>>(
    endpoints.core.problemset.addManual,
    body,
  )
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const data = (res.data ?? raw.data ?? {}) as Record<string, unknown>
  if (!res.success) {
    return { success: false, message: res.message || '发布失败', data: null }
  }
  return {
    success: true,
    message: 'ok',
    data: {
      problemId: num(data.problemId),
      fetchTriggered: bool(data.fetchTriggered),
    },
    raw: res.raw,
  }
}

export async function listFavoriteProblemsets(params?: {
  page?: number
  pageSize?: number
}): Promise<
  ApiResult<{ list: ProblemsetInfo[]; total: number; page: number; pageSize: number }>
> {
  const res = await get<unknown>(endpoints.core.problemset.favorites, {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
  })
  const raw = (res.raw ?? {}) as Record<string, unknown>
  if (!res.success) {
    return { success: false, message: res.message, data: null, status: res.status }
  }
  const list = Array.isArray(res.data)
    ? (res.data as Record<string, unknown>[])
    : Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>[])
      : []
  return {
    success: true,
    message: 'ok',
    data: {
      list: list.map(normalizeSet),
      total: num(raw.total),
      page: num(raw.page, 1),
      pageSize: num(raw.pageSize, 20),
    },
    raw: res.raw,
  }
}

export async function toggleProblemsetFavorite(
  id: number,
): Promise<ApiResult<{ favorited: boolean }>> {
  const res = await post<Record<string, unknown>>(endpoints.core.problemset.favorite, {
    id,
  })
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const data = (res.data ?? raw.data ?? {}) as Record<string, unknown>
  if (!res.success) {
    return { success: false, message: res.message || '操作失败', data: null }
  }
  return {
    success: true,
    message: 'ok',
    data: { favorited: bool(data.favorited) },
    raw: res.raw,
  }
}

export async function removeProblemFromSet(
  problemsetId: number,
  problemId: number,
): Promise<ApiResult<null>> {
  const res = await post(endpoints.core.problemset.remove, { problemsetId, problemId })
  return {
    success: res.success,
    message: res.message,
    data: null,
    status: res.status,
  }
}

export async function toggleProblemsetLike(
  id: number,
): Promise<ApiResult<{ liked: boolean; likeCount: number }>> {
  const res = await post<Record<string, unknown>>(endpoints.core.problemset.like, { id })
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const data = (res.data ?? raw.data ?? {}) as Record<string, unknown>
  if (!res.success) {
    return { success: false, message: res.message || '操作失败', data: null }
  }
  return {
    success: true,
    message: 'ok',
    data: { liked: bool(data.liked), likeCount: num(data.likeCount) },
    raw: res.raw,
  }
}

