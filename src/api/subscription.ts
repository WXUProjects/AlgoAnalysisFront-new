import {
  endpoints,
  type MyAiStatusRes,
  type MySubscription,
  type SubscriptionOrder,
  type SubscriptionPlan,
  type SubUser,
} from '@shared/api'
import { get, post, num, str, bool, type ApiResult } from '@/lib/http'

function normalizePlan(raw: Record<string, unknown>): SubscriptionPlan {
  return {
    plan: str(raw.plan),
    priceCents: num(raw.priceCents),
    manualRefreshDaily: num(raw.manualRefreshDaily),
    syncIntervalMin: num(raw.syncIntervalMin),
    aiAnalyzeMonth: num(raw.aiAnalyzeMonth),
    enableFetchProblem: bool(raw.enableFetchProblem),
    enableAiAnalyze: bool(raw.enableAiAnalyze),
    enableAiDaily: bool(raw.enableAiDaily),
    enableRegularDaily: bool(raw.enableRegularDaily),
    days: num(raw.days),
    enabled: bool(raw.enabled),
  }
}

function normalizeMySubscription(raw: Record<string, unknown>): MySubscription {
  const pendingDaysLeft = num(raw.pendingDaysLeft)
  return {
    tier: str(raw.tier),
    expireAt: num(raw.expireAt),
    source: str(raw.source),
    daysLeft: num(raw.daysLeft),
    pendingTier: str(raw.pendingTier) || undefined,
    pendingDaysLeft: pendingDaysLeft > 0 ? pendingDaysLeft : undefined,
  }
}

function normalizeOrder(raw: Record<string, unknown>): SubscriptionOrder {
  const months = num(raw.months)
  const days = num(raw.days)
  return {
    orderNo: str(raw.orderNo),
    payUrl: str(raw.payUrl),
    amountCents: num(raw.amountCents),
    expireAt: num(raw.expireAt),
    months: months > 0 ? months : undefined,
    days: days > 0 ? days : undefined,
  }
}

function normalizeSubUser(raw: Record<string, unknown>): SubUser {
  const pendingDays = num(raw.pendingDays)
  return {
    userId: num(raw.userId),
    username: str(raw.username),
    name: str(raw.name),
    tier: str(raw.tier),
    expireAt: num(raw.expireAt),
    source: str(raw.source),
    avatar: str(raw.avatar) || undefined,
    pendingTier: str(raw.pendingTier) || undefined,
    pendingDays: pendingDays > 0 ? pendingDays : undefined,
  }
}

/** 套餐列表（公开；前端对比表） */
export async function listPlans(): Promise<ApiResult<SubscriptionPlan[]>> {
  const res = await get<Record<string, unknown>>(endpoints.user.subscription.plans)
  if (!res.success || !res.data) return { ...res, data: [] }
  const plans = Array.isArray(res.data.plans)
    ? (res.data.plans as Record<string, unknown>[]).map(normalizePlan)
    : []
  return { ...res, data: plans }
}

/** 我的订阅状态（tier 空=未订阅） */
export async function getMySubscription(): Promise<ApiResult<MySubscription | null>> {
  const res = await get<Record<string, unknown>>(endpoints.user.subscription.my)
  if (!res.success || !res.data) return { ...res, data: null }
  return { ...res, data: normalizeMySubscription(res.data) }
}

/** 我的 AI 能力落地状态（AI 分析配额/来源 + AI 日报权限） */
export async function getMyAiStatus(): Promise<ApiResult<MyAiStatusRes | null>> {
  const res = await get<Record<string, unknown>>(endpoints.user.subscription.myAiStatus)
  if (!res.success || !res.data) return { ...res, data: null }
  const raw = res.data
  return {
    ...res,
    data: {
      code: num(raw.code),
      message: str(raw.message),
      aiAnalyzeQuota: num(raw.aiAnalyzeQuota),
      aiAnalyzeSource: str(raw.aiAnalyzeSource),
      aiDailyOrgAllowed: bool(raw.aiDailyOrgAllowed),
      aiDailyEnabled: bool(raw.aiDailyEnabled),
      aiAnalyzeUnlimited: bool(raw.aiAnalyzeUnlimited),
    },
  }
}

/** 创建订单（支付FM下单，返回支付链接 payUrl；months 1–12 默认 1） */
export async function createOrder(
  plan: string,
  months = 1,
): Promise<ApiResult<SubscriptionOrder | null>> {
  const res = await post<Record<string, unknown>>(endpoints.user.subscription.createOrder, {
    plan,
    months,
  })
  if (!res.success || !res.data) return { ...res, data: null }
  return { ...res, data: normalizeOrder(res.data) }
}

/** 查订单状态（支付回流轮询） */
export async function getOrder(
  orderNo: string,
): Promise<ApiResult<{ status: string; paidAt: number } | null>> {
  const res = await get<Record<string, unknown>>(endpoints.user.subscription.getOrder, { orderNo })
  if (!res.success || !res.data) return { ...res, data: null }
  return {
    ...res,
    data: {
      status: str(res.data.status),
      paidAt: num(res.data.paidAt),
    },
  }
}

/** 站管：人工赋予/更新订阅 */
export async function grantSubscription(
  userId: number,
  tier: string,
  days: number,
): Promise<ApiResult<unknown>> {
  return post(endpoints.user.subscription.grant, { userId, tier, days })
}

/** 站管：取消订阅 */
export async function revokeSubscription(userId: number): Promise<ApiResult<unknown>> {
  return post(endpoints.user.subscription.revoke, { userId })
}

/** 站管：订阅用户列表（keyword 模糊） */
export async function listSubscriptions(
  page: number,
  pageSize: number,
  keyword: string,
): Promise<ApiResult<{ list: SubUser[]; total: number }>> {
  const res = await get<Record<string, unknown>>(endpoints.user.subscription.adminList, {
    page,
    pageSize,
    keyword,
  })
  if (!res.success || !res.data) return { ...res, data: { list: [], total: 0 } }
  const list = Array.isArray(res.data.list)
    ? (res.data.list as Record<string, unknown>[]).map(normalizeSubUser)
    : []
  return { ...res, data: { list, total: num(res.data.total) } }
}

/** 站管：更新套餐配额模板 */
export async function updatePlans(plans: SubscriptionPlan[]): Promise<ApiResult<unknown>> {
  return post(endpoints.user.subscription.updatePlans, { plans })
}
