import {
  endpoints,
  type ProblemInfo,
  type ProblemListRes,
  type ProblemUserProfile,
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

function normalizeProblem(raw: Record<string, unknown>): ProblemInfo {
  const tags = Array.isArray(raw.tags) ? raw.tags.map((t) => str(t)) : []
  const solutions = Array.isArray(raw.solutions)
    ? (raw.solutions as Record<string, unknown>[]).map(normalizeSolution)
    : []
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
  }
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
}): Promise<ApiResult<Record<string, unknown>[]>> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.problem.submissions, {
    problemId: params.problemId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 50,
    ...(params.userId !== undefined ? { userId: params.userId } : {}),
  })
  if (!res.success) return { ...res, data: [] }
  const list = Array.isArray(res.data) ? res.data : []
  return { ...res, data: list }
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

export async function retryFailedProblems(limit = 0): Promise<ApiResult<unknown>> {
  return post(endpoints.core.problem.retryFailed, { limit })
}
