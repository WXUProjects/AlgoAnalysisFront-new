import {
  endpoints,
  type SponsorSettings,
  type SponsorOverview,
  type SponsorDonation,
  type SponsorExpense,
  type SponsorMonthlyRow,
  type SponsorDonateOrder,
} from '@shared/api'
import { get, post, num, str, bool, type ApiResult } from '@/lib/http'

export type {
  SponsorSettings,
  SponsorOverview,
  SponsorDonation,
  SponsorExpense,
  SponsorMonthlyRow,
  SponsorDonateOrder,
}

/** 兼容页面既有命名 */
export type Donation = SponsorDonation
export type Expense = SponsorExpense
export type MonthlyRow = SponsorMonthlyRow
export type DonationListResult = { list: SponsorDonation[]; total: number }

function normalizeSettings(raw: Record<string, unknown>): SponsorSettings {
  return {
    membershipSponsorEnabled: bool(raw.membershipSponsorEnabled),
    donationEnabled: bool(raw.donationEnabled),
    introMarkdown: str(raw.introMarkdown),
  }
}

function normalizeOverview(raw: Record<string, unknown>): SponsorOverview {
  return {
    balanceCents: num(raw.balanceCents),
    totalIncomeCents: num(raw.totalIncomeCents),
    totalExpenseCents: num(raw.totalExpenseCents),
    donationCount: num(raw.donationCount),
    monthIncomeCents: num(raw.monthIncomeCents),
    monthExpenseCents: num(raw.monthExpenseCents),
    loss: bool(raw.loss),
  }
}

function normalizeDonation(raw: Record<string, unknown>): SponsorDonation {
  return {
    id: num(raw.id),
    nickname: str(raw.nickname),
    amountCents: num(raw.amountCents),
    message: str(raw.message),
    createdAt: num(raw.createdAt),
  }
}

function normalizeExpense(raw: Record<string, unknown>): SponsorExpense {
  return {
    id: num(raw.id),
    amountCents: num(raw.amountCents),
    note: str(raw.note),
    kind: str(raw.kind),
    spentAt: num(raw.spentAt),
  }
}

function normalizeMonthly(raw: Record<string, unknown>): SponsorMonthlyRow {
  return {
    month: str(raw.month),
    incomeCents: num(raw.incomeCents),
    expenseCents: num(raw.expenseCents),
    netCents: num(raw.netCents),
  }
}

/** 公开：打赏页设置（入口开关 + 说明 Markdown） */
export async function getSponsorSettings(): Promise<ApiResult<SponsorSettings>> {
  const res = await get<Record<string, unknown>>(endpoints.user.sponsor.settings)
  if (!res.success || !res.data) return { ...res, data: null }
  return { ...res, data: normalizeSettings(res.data) }
}

/** 站管：更新打赏页设置（局部更新走读-合并-整体覆盖） */
export async function updateSponsorSettings(
  next: Partial<SponsorSettings>,
): Promise<ApiResult<SponsorSettings>> {
  const cur = await getSponsorSettings()
  const base: SponsorSettings = cur.data ?? {
    membershipSponsorEnabled: true,
    donationEnabled: true,
    introMarkdown: '',
  }
  const merged = { ...base, ...next }
  const res = await post<Record<string, unknown>>(
    endpoints.user.sponsor.updateSettings,
    {
      membershipSponsorEnabled: merged.membershipSponsorEnabled,
      donationEnabled: merged.donationEnabled,
      introMarkdown: merged.introMarkdown,
    },
  )
  if (!res.success) return { ...res, data: null }
  return { ...res, data: merged }
}

/** 公开：资金概览 */
export async function getSponsorOverview(): Promise<ApiResult<SponsorOverview>> {
  const res = await get<Record<string, unknown>>(endpoints.user.sponsor.overview)
  if (!res.success || !res.data) return { ...res, data: null }
  return { ...res, data: normalizeOverview(res.data) }
}

/** 公开：赞助名单（时间倒序 + 分页；keyword 模糊） */
export async function listDonations(
  page: number,
  pageSize: number,
  keyword = '',
): Promise<ApiResult<DonationListResult>> {
  const res = await get<Record<string, unknown>>(endpoints.user.sponsor.donations, {
    page,
    pageSize,
    keyword,
  })
  if (!res.success || !res.data) return { ...res, data: { list: [], total: 0 } }
  const list = Array.isArray(res.data.list)
    ? (res.data.list as Record<string, unknown>[]).map(normalizeDonation)
    : []
  return { ...res, data: { list, total: num(res.data.total) } }
}

/** 公开：开支明细（时间倒序） */
export async function listExpenses(): Promise<ApiResult<SponsorExpense[]>> {
  const res = await get<Record<string, unknown>>(endpoints.user.sponsor.expenses)
  if (!res.success || !res.data) return { ...res, data: [] }
  const list = Array.isArray(res.data.list)
    ? (res.data.list as Record<string, unknown>[]).map(normalizeExpense)
    : []
  return { ...res, data: list }
}

/** 公开：月度收支（近 count 个月，倒序） */
export async function getMonthlyRows(count = 6): Promise<ApiResult<SponsorMonthlyRow[]>> {
  const res = await get<Record<string, unknown>>(endpoints.user.sponsor.monthly, { count })
  if (!res.success || !res.data) return { ...res, data: [] }
  const list = Array.isArray(res.data.list)
    ? (res.data.list as Record<string, unknown>[]).map(normalizeMonthly)
    : []
  return { ...res, data: list }
}

/** 登录：打赏下单（支付FM，返回支付链接）；giftMembership=true 时支付后回赠 1 个月会员 */
export async function donate(
  amountCents: number,
  message: string,
  giftMembership = false,
): Promise<ApiResult<SponsorDonateOrder | null>> {
  const res = await post<Record<string, unknown>>(endpoints.user.sponsor.donate, {
    amountCents,
    message,
    giftMembership,
  })
  if (!res.success || !res.data) return { ...res, data: null }
  return {
    ...res,
    data: {
      orderNo: str(res.data.orderNo),
      payUrl: str(res.data.payUrl),
      amountCents: num(res.data.amountCents),
      expireAt: num(res.data.expireAt),
    },
  }
}

/** 登录：查打赏订单状态（回流轮询） */
export async function getDonationStatus(
  orderNo: string,
): Promise<ApiResult<{ status: string; paidAt: number } | null>> {
  const res = await get<Record<string, unknown>>(endpoints.user.sponsor.donation, { orderNo })
  if (!res.success || !res.data) return { ...res, data: null }
  return {
    ...res,
    data: { status: str(res.data.status), paidAt: num(res.data.paidAt) },
  }
}

function ymdToSec(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(y || 1970, (m || 1) - 1, d || 1, 12, 0, 0, 0)
  return Math.floor(date.getTime() / 1000)
}

/** 站管：记录一笔开支（spentAtYmd 为 YYYY-MM-DD，可空=当前） */
export async function recordExpense(
  amountCents: number,
  note: string,
  spentAtYmd?: string,
): Promise<ApiResult<unknown>> {
  return post(endpoints.user.sponsor.recordExpense, {
    amountCents,
    note,
    spentAt: spentAtYmd ? ymdToSec(spentAtYmd) : 0,
  })
}

/** 站管：扣减可用金额（note 必填） */
export async function adjustBalance(
  amountCents: number,
  note: string,
): Promise<ApiResult<unknown>> {
  return post(endpoints.user.sponsor.adjustBalance, { amountCents, note })
}
