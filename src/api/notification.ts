import { endpoints, type NotificationItem, type NotificationListRes } from '@shared/api'
import { get, post, num, str, bool, type ApiResult } from '@/lib/http'

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
  const raw = (res.raw ?? {}) as Record<string, unknown>
  let listRaw: Record<string, unknown>[] = []
  if (Array.isArray(raw.list)) listRaw = raw.list as Record<string, unknown>[]
  else if (Array.isArray(res.data)) listRaw = res.data as Record<string, unknown>[]
  return {
    ...res,
    data: {
      list: listRaw.map(normalizeItem),
      total: num(raw.total),
      page: num(raw.page) || (params?.page ?? 1),
      pageSize: num(raw.pageSize) || (params?.pageSize ?? 20),
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
