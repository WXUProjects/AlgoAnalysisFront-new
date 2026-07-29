import { endpoints, type NotificationItem, type NotificationListRes } from '@shared/api'
import {
  get,
  post,
  num,
  str,
  bool,
  parseListResponse,
  type ApiResult,
} from '@/lib/http'

function normalizeItem(raw: Record<string, unknown>): NotificationItem {
  return {
    id: num(raw.id),
    type: str(raw.type),
    title: str(raw.title),
    body: str(raw.body),
    actorId: num(raw.actorId),
    refType: str(raw.refType),
    refId: num(raw.refId),
    problemId: num(raw.problemId),
    payload: str(raw.payload),
    isRead: bool(raw.isRead),
    createdAt: num(raw.createdAt),
  }
}

export async function listNotifications(params?: {
  page?: number
  pageSize?: number
}): Promise<ApiResult<NotificationListRes>> {
  const res = await get<unknown>(endpoints.user.notification.list, {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
  })
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const parsed = parseListResponse(raw, normalizeItem)
  return {
    ...res,
    data: {
      list: parsed.list,
      total: parsed.total,
      page: parsed.page || (params?.page ?? 1),
      pageSize: parsed.pageSize || (params?.pageSize ?? 20),
      unreadCount: num(raw.unreadCount),
    },
  }
}

export async function getUnreadNotificationCount(): Promise<ApiResult<number>> {
  const res = await get<unknown>(endpoints.user.notification.unreadCount)
  if (!res.success) return { ...res, data: 0 }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  return { ...res, data: num(raw.unreadCount) }
}

export async function markNotificationsRead(ids: number[]): Promise<ApiResult<null>> {
  const res = await post<null>(endpoints.user.notification.read, { ids })
  return { ...res, data: null }
}

export async function markAllNotificationsRead(): Promise<ApiResult<null>> {
  const res = await post<null>(endpoints.user.notification.readAll, {})
  return { ...res, data: null }
}

/** 硬删除当前用户全部站内信，返回删除条数 */
export async function clearAllNotifications(): Promise<ApiResult<number>> {
  const res = await post<unknown>(endpoints.user.notification.clearAll, {})
  if (!res.success) return { ...res, data: 0 }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  return { ...res, data: num(raw.deleted) }
}
