import {
  endpoints,
  type AdminUpdateProblemReq,
  type HotProblemItem,
  type HotProblemRes,
  type ProblemContributor,
  type ProblemEditInfo,
  type ProblemInfo,
  type ProblemListRes,
  type ProblemRelatedContest,
  type ProblemUserProfile,
  type ProposeProblemEditReq,
  type ReviewProblemEditReq,
  type SolutionMeta,
} from '@shared/api'
import { get, post, num, str, bool, type ApiResult } from '@/lib/http'

export interface ProblemProgressData {
  items: { status: string; count: number }[]
  recentFailed: Record<string, unknown>[]
  recentFailedPerm: Record<string, unknown>[]
  total: number
  paused: boolean
  fetchPaused: boolean
  analyzePaused: boolean
  activeJobs: Record<string, unknown>[]
  queues: Record<string, unknown>[]
  inProgress: Record<string, unknown>[]
}

function normalizeSolution(raw: Record<string, unknown>): SolutionMeta {
  return {
    name: str(raw.name),
    timeComplexity: str(raw.timeComplexity),
    spaceComplexity: str(raw.spaceComplexity),
    briefExplanation: str(raw.briefExplanation),
  }
}

function cleanTitle(title: string): string {
  const raw = title.replace(/\r/g, '\n')
  for (const line of raw.split('\n')) {
    let t = line.trim()
    if (!t) continue
    if (/^editorial$/i.test(t) || t === '解説') continue
    t = t.replace(/\s*Editorial\s*$/i, '').replace(/\s*解説\s*$/, '').trim()
    t = t.replace(/\s+/g, ' ')
    if (t) return t
  }
  return raw.replace(/\s+/g, ' ').trim()
}

function normalizeContributor(raw: Record<string, unknown>): ProblemContributor {
  return {
    userId: num(raw.userId),
    name: str(raw.name),
    username: str(raw.username),
    avatar: str(raw.avatar) || undefined,
  }
}

function normalizeProblem(raw: Record<string, unknown>): ProblemInfo {
  const tags = Array.isArray(raw.tags) ? raw.tags.map((t) => str(t)) : []
  const solutions = Array.isArray(raw.solutions)
    ? (raw.solutions as Record<string, unknown>[]).map(normalizeSolution)
    : []
  const contributors = Array.isArray(raw.contributors)
    ? (raw.contributors as Record<string, unknown>[])
        .map(normalizeContributor)
        .filter((c) => c.userId > 0)
    : undefined
  return {
    id: num(raw.id),
    platform: str(raw.platform),
    externalId: str(raw.externalId),
    title: cleanTitle(str(raw.title)),
    url: str(raw.url),
    contentMd: str(raw.contentMd),
    problemType: str(raw.problemType),
    tags,
    solutions,
    difficulty: str(raw.difficulty),
    status: str(raw.status),
    errorMsg: str(raw.errorMsg),
    lastSubmittedAt: num(raw.lastSubmittedAt),
    userStatus: str(raw.userStatus),
    contributors:
      contributors && contributors.length > 0 ? contributors : undefined,
  }
}

export type { ProblemRelatedContest }

function normalizeRelatedContest(
  raw: Record<string, unknown>,
): ProblemRelatedContest {
  return {
    platform: str(raw.platform),
    contestId: str(raw.contestId),
    label: str(raw.label),
    contestName: str(raw.contestName),
    contestLogId: num(raw.contestLogId),
    contestTime: num(raw.contestTime),
    problemTitle: str(raw.problemTitle),
    contestUrl: str(raw.contestUrl),
  }
}

/** 本题出现过的比赛（全平台，来自 contest_problems） */
export async function listProblemRelatedContests(
  problemId: number | string,
): Promise<ApiResult<ProblemRelatedContest[]>> {
  const res = await get<Record<string, unknown>[]>(
    endpoints.core.problem.relatedContests,
    { problemId },
  )
  if (!res.success) return { ...res, data: null }
  const list = Array.isArray(res.data)
    ? res.data.map(normalizeRelatedContest)
    : []
  return { ...res, data: list }
}

export async function listProblems(params: {
  page?: number
  pageSize?: number
  sort?: string
  platforms?: string
  tags?: string
  userStatus?: string
  userId?: number
  keyword?: string
  difficulty?: string
  followingOnly?: boolean
}): Promise<ApiResult<ProblemListRes>> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.problem.list, {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    sort: params.sort ?? 'latest_desc',
    ...(params.platforms ? { platforms: params.platforms } : {}),
    ...(params.tags ? { tags: params.tags } : {}),
    ...(params.userStatus ? { userStatus: params.userStatus } : {}),
    ...(params.userId !== undefined ? { userId: params.userId } : {}),
    ...(params.keyword ? { keyword: params.keyword } : {}),
    ...(params.difficulty ? { difficulty: params.difficulty } : {}),
    ...(params.followingOnly ? { followingOnly: true } : {}),
  })
  if (!res.success) return { ...res, data: null }
  const list = Array.isArray(res.data) ? res.data.map(normalizeProblem) : []
  const raw = (res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      data: list,
      total: num(raw.total, list.length),
      page: num(raw.page, params.page ?? 1),
      pageSize: num(raw.pageSize, params.pageSize ?? 20),
    },
  }
}

function normalizeHotItem(raw: Record<string, unknown>): HotProblemItem {
  const nested =
    raw.problem && typeof raw.problem === 'object'
      ? (raw.problem as Record<string, unknown>)
      : raw
  const problem = normalizeProblem(nested)
  const last = num(raw.lastSubmittedAt, problem.lastSubmittedAt)
  if (last && !problem.lastSubmittedAt) {
    problem.lastSubmittedAt = last
  }
  return {
    problem,
    submitCount: num(raw.submitCount),
    solverCount: num(raw.solverCount),
    acCount: num(raw.acCount),
    score: num(raw.score),
    lastSubmittedAt: last,
  }
}

/**
 * 全站热题：近 days 天（默认 2）按提交次数/做题人数/AC 综合热度排序。
 * 热度 = submit×1 + solver×3 + ac×2
 */
export async function listHotProblems(params?: {
  page?: number
  pageSize?: number
  days?: number
}): Promise<ApiResult<HotProblemRes>> {
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const days = params?.days ?? 2
  const res = await get<Record<string, unknown>[]>(endpoints.core.problem.hot, {
    page,
    pageSize,
    days,
  })
  if (!res.success) return { ...res, data: null }
  const list = Array.isArray(res.data)
    ? res.data.map((r) => normalizeHotItem(r as Record<string, unknown>))
    : []
  const raw = (res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      data: list,
      total: num(raw.total, list.length),
      page: num(raw.page, page),
      pageSize: num(raw.pageSize, pageSize),
      days: num(raw.days, days),
    },
  }
}

export type TagCountItem = { tag: string; count: number }

export async function listProblemTags(
  limit = 100,
): Promise<ApiResult<TagCountItem[]>> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.problem.tags, {
    limit,
  })
  if (!res.success) return { ...res, data: [] }
  // 兼容 data 数组或顶层 data
  const rawList = Array.isArray(res.data)
    ? res.data
    : Array.isArray((res.raw as Record<string, unknown>)?.data)
      ? ((res.raw as Record<string, unknown>).data as Record<string, unknown>[])
      : []
  return {
    ...res,
    data: rawList.map((r) => ({
      tag: str(r.tag),
      count: num(r.count),
    })),
  }
}

export async function getProblem(id: number | string): Promise<ApiResult<ProblemInfo>> {
  const res = await get<Record<string, unknown>>(endpoints.core.problem.get, { id })
  if (!res.success || !res.data) return { ...res, data: null }
  // get may return bare problem or { data: problem }
  const raw = res.data
  if (raw.id !== undefined || raw.title !== undefined) {
    return { ...res, data: normalizeProblem(raw) }
  }
  return { ...res, data: null }
}

export async function getProblemSubmissions(params: {
  problemId: number | string
  page?: number
  pageSize?: number
  userId?: number
  followingOnly?: boolean
  /** 空=全部；AC=仅通过 */
  status?: string
}): Promise<ApiResult<{ list: Record<string, unknown>[]; total: number }>> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.problem.submissions, {
    problemId: params.problemId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    ...(params.userId !== undefined ? { userId: params.userId } : {}),
    ...(params.followingOnly ? { followingOnly: true } : {}),
    ...(params.status ? { status: params.status } : {}),
  })
  if (!res.success) return { ...res, data: { list: [], total: 0 } }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const list = Array.isArray(res.data) ? res.data : Array.isArray(raw.data) ? (raw.data as Record<string, unknown>[]) : []
  return { ...res, data: { list, total: num(raw.total) } }
}

export async function getProblemFollowingStatus(
  problemId: number | string,
): Promise<ApiResult<import('@shared/api').ProblemFollowingStatusItem[]>> {
  const res = await get<Record<string, unknown>[]>(
    endpoints.core.problem.followingStatus,
    { problemId },
  )
  if (!res.success) return { ...res, data: [] }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  let listRaw: Record<string, unknown>[] = []
  if (Array.isArray(res.data)) listRaw = res.data
  else if (Array.isArray(raw.data)) listRaw = raw.data as Record<string, unknown>[]
  return {
    ...res,
    data: listRaw.map((r) => ({
      userId: num(r.userId),
      username: str(r.username),
      name: str(r.name),
      avatar: str(r.avatar),
      status: str(r.status) || 'NONE',
    })),
  }
}

export async function getProblemUserProfile(
  userId: number,
): Promise<ApiResult<ProblemUserProfile>> {
  const res = await get<Record<string, unknown>>(endpoints.core.problem.userProfile, {
    userId,
  })
  if (!res.success) return { ...res, data: null }

  // 真实: { code, message, radar, platforms, difficulties, totalAc } 无 data 包裹
  const d = (res.data && typeof res.data === 'object'
    ? res.data
    : (res.raw as Record<string, unknown>)) as Record<string, unknown>

  return {
    ...res,
    data: {
      radar: Array.isArray(d.radar)
        ? (d.radar as Record<string, unknown>[]).map((r) => ({
            tag: str(r.tag),
            score: num(r.score),
            acCount: num(r.acCount),
          }))
        : [],
      platforms: Array.isArray(d.platforms)
        ? (d.platforms as Record<string, unknown>[]).map((p) => ({
            name: str(p.name),
            count: num(p.count),
          }))
        : [],
      difficulties: Array.isArray(d.difficulties)
        ? (d.difficulties as Record<string, unknown>[]).map((p) => ({
            name: str(p.name),
            count: num(p.count),
          }))
        : [],
      totalAc: num(d.totalAc),
    },
  }
}

export async function getProblemProgress(): Promise<ApiResult<ProblemProgressData>> {
  const res = await get<Record<string, unknown>>(endpoints.core.problem.progress)
  if (!res.success) return { ...res, data: null }
  // 顶层: items, recentFailed, total, paused, activeJobs, queues, inProgress
  const d = (res.raw && typeof res.raw === 'object'
    ? (res.raw as Record<string, unknown>)
    : (res.data as Record<string, unknown>)) || {}

  return {
    ...res,
    data: {
      items: Array.isArray(d.items)
        ? (d.items as Record<string, unknown>[]).map((i) => ({
            status: str(i.status),
            count: num(i.count),
          }))
        : [],
      recentFailed: Array.isArray(d.recentFailed)
        ? (d.recentFailed as Record<string, unknown>[])
        : [],
      recentFailedPerm: Array.isArray(d.recentFailedPerm)
        ? (d.recentFailedPerm as Record<string, unknown>[])
        : [],
      total: num(d.total),
      paused: bool(d.paused),
      fetchPaused: bool(d.fetchPaused),
      analyzePaused: bool(d.analyzePaused) || bool(d.paused),
      activeJobs: Array.isArray(d.activeJobs)
        ? (d.activeJobs as Record<string, unknown>[])
        : [],
      queues: Array.isArray(d.queues) ? (d.queues as Record<string, unknown>[]) : [],
      inProgress: Array.isArray(d.inProgress)
        ? (d.inProgress as Record<string, unknown>[])
        : [],
    },
  }
}

export async function toggleAnalyze(pause?: boolean): Promise<ApiResult<unknown>> {
  const body = pause === undefined ? {} : { pause, pauseSet: true }
  return post(endpoints.core.problem.toggleAnalyze, body)
}

export async function toggleFetch(pause?: boolean): Promise<ApiResult<unknown>> {
  const body = pause === undefined ? {} : { pause, pauseSet: true }
  return post(endpoints.core.problem.toggleFetch, body)
}

export async function resetAllProblems(requeue = true): Promise<ApiResult<unknown>> {
  return post(endpoints.core.problem.resetAll, { requeue, requeueSet: true })
}

/** 近 6 月提交回填：无题面→爬取；有题面未分析→分析；已分析丢弃。不清 MQ。 */
export async function backfillProblems(limit = 0): Promise<ApiResult<unknown>> {
  return post(endpoints.core.problem.backfill, { limit })
}

/** purge 爬取/分析 MQ，再按 DB 待爬取/待分析重灌（低优先级）。 */
export async function resetProblemQueues(): Promise<ApiResult<unknown>> {
  return post(endpoints.core.problem.resetQueues, {})
}

/** 重试近 6 月失败题。includePermanent=true 时含可恢复的永久失败。 */
export async function retryFailedProblems(
  limit = 0,
  includePermanent = false,
): Promise<ApiResult<unknown>> {
  return post(endpoints.core.problem.retryFailed, { limit, includePermanent })
}

/** 清空近期失败并停止自动退避重试（FAILED → FAILED_PERM）。 */
export async function clearRecentFailedProblems(): Promise<ApiResult<unknown>> {
  return post(endpoints.core.problem.clearRecentFailed, {})
}

function normalizeEditInfo(raw: Record<string, unknown>): ProblemEditInfo {
  return {
    id: num(raw.id),
    problemId: num(raw.problemId),
    platform: str(raw.platform),
    externalId: str(raw.externalId),
    problemTitle: str(raw.problemTitle),
    userId: num(raw.userId),
    userName: str(raw.userName),
    hasTags: bool(raw.hasTags),
    hasContent: bool(raw.hasContent),
    proposedTags: Array.isArray(raw.proposedTags)
      ? (raw.proposedTags as unknown[]).map((t) => str(t))
      : [],
    proposedContentMd: str(raw.proposedContentMd),
    proposedTitle: str(raw.proposedTitle),
    note: str(raw.note),
    status: str(raw.status),
    reviewerId: num(raw.reviewerId),
    reviewNote: str(raw.reviewNote),
    createdAt: num(raw.createdAt),
    updatedAt: num(raw.updatedAt),
    currentTags: Array.isArray(raw.currentTags)
      ? (raw.currentTags as unknown[]).map((t) => str(t))
      : [],
    currentContentMd: str(raw.currentContentMd),
    currentTitle: str(raw.currentTitle),
  }
}

/** 站点管理员直接修改标签/题面 */
export async function adminUpdateProblem(
  body: AdminUpdateProblemReq,
): Promise<ApiResult<ProblemInfo>> {
  const res = await post<Record<string, unknown>>(endpoints.core.problem.adminUpdate, body)
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw) as Record<string, unknown>
  // 响应可能是 { data: ProblemInfo } 或顶层字段
  const nested = raw?.data
  if (nested && typeof nested === 'object') {
    return { ...res, data: normalizeProblem(nested as Record<string, unknown>) }
  }
  if (raw && (raw.id !== undefined || raw.title !== undefined)) {
    return { ...res, data: normalizeProblem(raw) }
  }
  return { ...res, data: null }
}

/** 提交修改申请；站管会直存 */
export async function proposeProblemEdit(
  body: ProposeProblemEditReq,
): Promise<ApiResult<{ requestId: number }>> {
  const res = await post<Record<string, unknown>>(endpoints.core.problem.proposeEdit, body)
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: { requestId: num(raw.requestId) },
  }
}

export async function listProblemEditRequests(params?: {
  page?: number
  pageSize?: number
  status?: string
}): Promise<ApiResult<{ list: ProblemEditInfo[]; total: number; page: number; pageSize: number }>> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.problem.editRequests, {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    ...(params?.status ? { status: params.status } : {}),
  })
  if (!res.success) return { ...res, data: null }
  const list = Array.isArray(res.data)
    ? res.data.map((r) => normalizeEditInfo(r as Record<string, unknown>))
    : []
  const raw = (res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      list,
      total: num(raw.total, list.length),
      page: num(raw.page, params?.page ?? 1),
      pageSize: num(raw.pageSize, params?.pageSize ?? 20),
    },
  }
}

export async function reviewProblemEdit(
  body: ReviewProblemEditReq,
): Promise<ApiResult<unknown>> {
  return post(endpoints.core.problem.reviewEdit, body)
}

export async function getMyPendingProblemEdit(
  problemId: number | string,
): Promise<ApiResult<{ hasPending: boolean; data: ProblemEditInfo | null }>> {
  const res = await get<Record<string, unknown>>(endpoints.core.problem.myPendingEdit, {
    problemId,
  })
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const hasPending = bool(raw.hasPending)
  let data: ProblemEditInfo | null = null
  if (hasPending && raw.data && typeof raw.data === 'object') {
    data = normalizeEditInfo(raw.data as Record<string, unknown>)
  }
  return { ...res, data: { hasPending, data } }
}
