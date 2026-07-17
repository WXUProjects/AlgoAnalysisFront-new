import {
  endpoints,
  type ActivityFeedItem,
  type ProblemCommentItem,
  type ProblemUserSolutionItem,
  type UserRecentCommentItem,
  type UserRecentSolutionItem,
} from '@shared/api'
import { get, post, num, str, type ApiResult } from '@/lib/http'

function normComment(raw: Record<string, unknown>): ProblemCommentItem {
  return {
    id: num(raw.id),
    problemId: num(raw.problemId),
    userId: num(raw.userId),
    username: str(raw.username),
    name: str(raw.name),
    avatar: str(raw.avatar),
    content: str(raw.content),
    createdAt: num(raw.createdAt),
  }
}

function normSolution(raw: Record<string, unknown>): ProblemUserSolutionItem {
  return {
    id: num(raw.id),
    problemId: num(raw.problemId),
    userId: num(raw.userId),
    username: str(raw.username),
    name: str(raw.name),
    avatar: str(raw.avatar),
    title: str(raw.title),
    excerpt: str(raw.excerpt),
    contentMd: str(raw.contentMd),
    createdAt: num(raw.createdAt),
    updatedAt: num(raw.updatedAt),
  }
}

function listFrom(res: ApiResult<unknown>): Record<string, unknown>[] {
  const raw = (res.raw ?? {}) as Record<string, unknown>
  if (Array.isArray(raw.list)) return raw.list as Record<string, unknown>[]
  if (Array.isArray(res.data)) return res.data as Record<string, unknown>[]
  return []
}

export async function listProblemComments(params: {
  problemId: number | string
  page?: number
  pageSize?: number
}): Promise<ApiResult<{ list: ProblemCommentItem[]; total: number; page: number; pageSize: number }>> {
  const res = await get<unknown>(endpoints.core.problem.commentList, {
    problemId: params.problemId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  })
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      list: listFrom(res).map(normComment),
      total: num(raw.total),
      page: num(raw.page) || (params.page ?? 1),
      pageSize: num(raw.pageSize) || (params.pageSize ?? 20),
    },
  }
}

export async function createProblemComment(body: {
  problemId: number
  content: string
}): Promise<ApiResult<ProblemCommentItem | null>> {
  const res = await post<Record<string, unknown>>(endpoints.core.problem.commentCreate, body)
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const data = (raw.data ?? res.data) as Record<string, unknown> | null
  return { ...res, data: data ? normComment(data) : null }
}

export async function deleteProblemComment(id: number): Promise<ApiResult<null>> {
  const res = await post<null>(endpoints.core.problem.commentDelete, { id })
  return { ...res, data: null }
}

export async function listProblemSolutions(params: {
  problemId: number | string
  page?: number
  pageSize?: number
}): Promise<ApiResult<{ list: ProblemUserSolutionItem[]; total: number; page: number; pageSize: number }>> {
  const res = await get<unknown>(endpoints.core.problem.solutionList, {
    problemId: params.problemId,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  })
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      list: listFrom(res).map(normSolution),
      total: num(raw.total),
      page: num(raw.page) || (params.page ?? 1),
      pageSize: num(raw.pageSize) || (params.pageSize ?? 20),
    },
  }
}

export async function getProblemSolution(
  id: number | string,
): Promise<ApiResult<ProblemUserSolutionItem | null>> {
  const res = await get<Record<string, unknown>>(endpoints.core.problem.solutionGet, { id })
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const data = (raw.data ?? res.data) as Record<string, unknown> | null
  return { ...res, data: data ? normSolution(data) : null }
}

export async function createProblemSolution(body: {
  problemId: number
  title: string
  contentMd: string
}): Promise<ApiResult<ProblemUserSolutionItem | null>> {
  const res = await post<Record<string, unknown>>(endpoints.core.problem.solutionCreate, body)
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const data = (raw.data ?? res.data) as Record<string, unknown> | null
  return { ...res, data: data ? normSolution(data) : null }
}

export async function updateProblemSolution(body: {
  id: number
  title: string
  contentMd: string
}): Promise<ApiResult<null>> {
  const res = await post<null>(endpoints.core.problem.solutionUpdate, body)
  return { ...res, data: null }
}

export async function deleteProblemSolution(id: number): Promise<ApiResult<null>> {
  const res = await post<null>(endpoints.core.problem.solutionDelete, { id })
  return { ...res, data: null }
}

export async function listActivityFeed(params?: {
  page?: number
  pageSize?: number
  type?: string
}): Promise<ApiResult<{ list: ActivityFeedItem[]; total: number; page: number; pageSize: number }>> {
  const res = await get<unknown>(endpoints.core.activity.feed, {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    ...(params?.type ? { type: params.type } : {}),
  })
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const list = listFrom(res).map((r) => ({
    id: num(r.id),
    orgId: num(r.orgId),
    userId: num(r.userId),
    username: str(r.username),
    name: str(r.name),
    avatar: str(r.avatar),
    type: str(r.type),
    refId: num(r.refId),
    problemId: num(r.problemId),
    problemTitle: str(r.problemTitle),
    platform: str(r.platform),
    title: str(r.title),
    excerpt: str(r.excerpt),
    createdAt: num(r.createdAt),
  }))
  return {
    ...res,
    data: {
      list,
      total: num(raw.total),
      page: num(raw.page) || (params?.page ?? 1),
      pageSize: num(raw.pageSize) || (params?.pageSize ?? 20),
    },
  }
}

export async function listUserRecentComments(params: {
  userId: number | string
  limit?: number
}): Promise<ApiResult<UserRecentCommentItem[]>> {
  const res = await get<unknown>(endpoints.core.user.recentComments, {
    userId: params.userId,
    limit: params.limit ?? 10,
  })
  if (!res.success) return { ...res, data: [] }
  return {
    ...res,
    data: listFrom(res).map((r) => ({
      id: num(r.id),
      problemId: num(r.problemId),
      problemTitle: str(r.problemTitle),
      platform: str(r.platform),
      content: str(r.content),
      createdAt: num(r.createdAt),
    })),
  }
}

export async function listUserRecentSolutions(params: {
  userId: number | string
  limit?: number
}): Promise<ApiResult<UserRecentSolutionItem[]>> {
  const res = await get<unknown>(endpoints.core.user.recentSolutions, {
    userId: params.userId,
    limit: params.limit ?? 10,
  })
  if (!res.success) return { ...res, data: [] }
  return {
    ...res,
    data: listFrom(res).map((r) => ({
      id: num(r.id),
      problemId: num(r.problemId),
      problemTitle: str(r.problemTitle),
      platform: str(r.platform),
      title: str(r.title),
      excerpt: str(r.excerpt),
      createdAt: num(r.createdAt),
    })),
  }
}
