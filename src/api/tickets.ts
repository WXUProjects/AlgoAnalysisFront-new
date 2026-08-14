import {
  endpoints,
  type CreateMessageReq,
  type CreateMessageRes,
  type CreateTicketReq,
  type CreateTicketRes,
  type GetMessagesRes,
  type GetTicketRes,
  type ListTicketsReq,
  type ListTicketsRes,
  type PatchStatusReq,
  type PatchStatusRes,
  type Ticket,
  type TicketMessage,
} from '@shared/api'
import { get, post, patch, num, str, type ApiResult } from '@/lib/http'

function normalizeTicket(raw: Record<string, unknown>): Ticket {
  return {
    id: str(raw.id),
    ticketNumber: num(raw.ticketNumber),
    title: str(raw.title),
    status: str(raw.status),
    priority: raw.priority ? str(raw.priority) : undefined,
    awaitingActor: raw.awaitingActor ? str(raw.awaitingActor) : undefined,
    latestMessageAt: raw.latestMessageAt ? num(raw.latestMessageAt) : undefined,
    createdAt: raw.createdAt ? num(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? num(raw.updatedAt) : undefined,
  }
}

function normalizeMessage(raw: Record<string, unknown>): TicketMessage {
  return {
    id: str(raw.id),
    sequenceNo: num(raw.sequenceNo),
    senderType: str(raw.senderType),
    contentType: str(raw.contentType),
    content: str(raw.content),
    sentAt: raw.sentAt ? num(raw.sentAt) : undefined,
  }
}

function parseTicketRes(res: ApiResult<unknown>): ApiResult<GetTicketRes> {
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    success: res.success,
    message: res.message || (res.success ? 'ok' : '工单加载失败，过会儿再试'),
    data: {
      success: res.success,
      message: res.message || '',
      ticket: raw.ticket ? normalizeTicket(raw.ticket as Record<string, unknown>) : undefined,
    },
  }
}

function parseList(res: ApiResult<unknown>): ApiResult<ListTicketsRes> {
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = Array.isArray(raw.list) ? (raw.list as Record<string, unknown>[]) : []
  return {
    success: res.success,
    message: res.message || (res.success ? 'ok' : '工单列表加载失败，过会儿再试'),
    data: {
      success: res.success,
      message: res.message || '',
      list: listRaw.map(normalizeTicket),
      nextCursor: raw.nextCursor ? str(raw.nextCursor) : undefined,
    },
  }
}

function parseMessages(res: ApiResult<unknown>): ApiResult<GetMessagesRes> {
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = Array.isArray(raw.list) ? (raw.list as Record<string, unknown>[]) : []
  return {
    success: res.success,
    message: res.message || (res.success ? 'ok' : '消息加载失败，过会儿再试'),
    data: {
      success: res.success,
      message: res.message || '',
      list: listRaw.map(normalizeMessage),
      nextAfterSequence: raw.nextAfterSequence ? num(raw.nextAfterSequence) : undefined,
    },
  }
}

function parseCreate(res: ApiResult<unknown>): ApiResult<CreateTicketRes> {
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    success: res.success,
    message: res.message || (res.success ? '工单已创建' : '创建失败，过会儿再试'),
    data: {
      success: res.success,
      message: res.message || '',
      ticket: raw.ticket ? normalizeTicket(raw.ticket as Record<string, unknown>) : undefined,
      messageInfo: raw.messageInfo
        ? normalizeMessage(raw.messageInfo as Record<string, unknown>)
        : undefined,
    },
  }
}

function parseCreateMessage(res: ApiResult<unknown>): ApiResult<CreateMessageRes> {
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    success: res.success,
    message: res.message || (res.success ? '已发送' : '发送失败，过会儿再试'),
    data: {
      success: res.success,
      message: res.message || '',
      messageInfo: raw.messageInfo
        ? normalizeMessage(raw.messageInfo as Record<string, unknown>)
        : undefined,
    },
  }
}

function parsePatchStatus(res: ApiResult<unknown>): ApiResult<PatchStatusRes> {
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    success: res.success,
    message: res.message || (res.success ? '已更新' : '操作失败，过会儿再试'),
    data: {
      success: res.success,
      message: res.message || '',
      ticket: raw.ticket ? normalizeTicket(raw.ticket as Record<string, unknown>) : undefined,
    },
  }
}

/** 工单列表（cursor 分页） */
export async function listTickets(
  params: ListTicketsReq = {},
): Promise<ApiResult<ListTicketsRes>> {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  if (params.limit) q.set('limit', String(params.limit))
  if (params.cursor) q.set('cursor', params.cursor)
  const qs = q.toString()
  return get(qs ? `${endpoints.user.tickets.list}?${qs}` : endpoints.user.tickets.list).then(
    parseList,
  )
}

/** 工单详情 */
export async function getTicket(id: string): Promise<ApiResult<GetTicketRes>> {
  return get(endpoints.user.tickets.get(id)).then(parseTicketRes)
}

/** 消息列表（after_sequence 增量） */
export async function getTicketMessages(
  id: string,
  afterSequence = 0,
): Promise<ApiResult<GetMessagesRes>> {
  return get(
    `${endpoints.user.tickets.messages(id)}?after_sequence=${afterSequence}`,
  ).then(parseMessages)
}

/** 创建工单 */
export async function createTicket(
  req: CreateTicketReq,
): Promise<ApiResult<CreateTicketRes>> {
  return post(endpoints.user.tickets.create, req).then(parseCreate)
}

/** 补充消息 */
export async function createTicketMessage(
  id: string,
  content: string,
): Promise<ApiResult<CreateMessageRes>> {
  const req: CreateMessageReq = { ticketId: id, content }
  return post(endpoints.user.tickets.createMessage(id), req).then(parseCreateMessage)
}

/** 用户修改工单状态（resolved | closed） */
export async function patchTicketStatus(
  id: string,
  status: string,
  reason = '',
): Promise<ApiResult<PatchStatusRes>> {
  const req: PatchStatusReq = { ticketId: id, status, reason }
  return patch(endpoints.user.tickets.patchStatus(id), req).then(parsePatchStatus)
}
