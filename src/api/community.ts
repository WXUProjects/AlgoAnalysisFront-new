import {
  endpoints,
  type ActivityFeedItem,
  type CommunityLikeResult,
  type CommunityReportResult,
  type CommunityTargetType,
  type ProblemCommentItem,
  type ProblemUserSolutionItem,
  type UserRecentCommentItem,
  type UserRecentSolutionItem,
} from '@shared/api'
import { get, post, num, str, type ApiResult } from '@/lib/http'

function normComment(raw: Record<string, unknown>): ProblemCommentItem {
  const repliesRaw = Array.isArray(raw.replies)
    ? (raw.replies as Record<string, unknown>[])
    : []
  return {
    id: num(raw.id),
    problemId: num(raw.problemId),
    solutionId: num(raw.solutionId) || undefined,
    userId: num(raw.userId),
    username: str(raw.username),
    name: str(raw.name),
    avatar: str(raw.avatar),
    content: str(raw.content),
    parentId: num(raw.parentId),
    rootId: num(raw.rootId),
    depth: num(raw.depth),
    replyToUserId: num(raw.replyToUserId) || undefined,
    replyToUsername: str(raw.replyToUsername) || undefined,
    replyToName: str(raw.replyToName) || undefined,
    likeCount: num(raw.likeCount),
    liked: Boolean(raw.liked),
    createdAt: num(raw.createdAt),
    replies: repliesRaw.map(normComment),
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
    likeCount: num(raw.likeCount),
    liked: Boolean(raw.liked),
    createdAt: num(raw.createdAt),
    updatedAt: num(raw.updatedAt),
    blogArticleId: num(raw.blogArticleId) || undefined,
    blogSlug: str(raw.blogSlug) || undefined,
    blogUsername: str(raw.blogUsername) || undefined,
  }
}

function listFrom(res: ApiResult<unknown>): Record<string, unknown>[] {
  const raw = (res.raw ?? {}) as Record<string, unknown>
  if (Array.isArray(raw.list)) return raw.list as Record<string, unknown>[]
  if (Array.isArray(res.data)) return res.data as Record<string, unknown>[]
  return []
}

export async function listProblemComments(params: {
  /** 题目讨论：传 problemId（不含题解评论） */
  problemId?: number | string
  /** 题解评论：传 solutionId（可只传此项） */
  solutionId?: number | string
  page?: number
  pageSize?: number
}): Promise<ApiResult<{ list: ProblemCommentItem[]; total: number; page: number; pageSize: number }>> {
  const res = await get<unknown>(endpoints.core.problem.commentList, {
    ...(params.problemId != null && params.problemId !== ''
      ? { problemId: params.problemId }
      : {}),
    ...(params.solutionId != null && params.solutionId !== ''
      ? { solutionId: params.solutionId }
      : {}),
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
  problemId?: number
  /** 挂在用户题解下；省略/0 为题目讨论 */
  solutionId?: number
  content: string
  /** 回复某条评论；0/省略为顶层 */
  parentId?: number
  /** 非公共域时可选：额外写入公共域发现流（仅题目顶层） */
  syncToPublic?: boolean
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

/** 点赞 toggle（评论 / 题解） */
export async function toggleCommunityLike(body: {
  targetType: CommunityTargetType
  targetId: number
}): Promise<ApiResult<CommunityLikeResult | null>> {
  const res = await post<Record<string, unknown>>(endpoints.core.problem.like, body)
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const data = (raw.data ?? res.data) as Record<string, unknown> | null
  if (!data) return { ...res, data: null }
  return {
    ...res,
    data: {
      liked: Boolean(data.liked),
      likeCount: num(data.likeCount),
      targetType: str(data.targetType),
      targetId: num(data.targetId),
    },
  }
}

/** 举报评论 / 题解 */
export async function reportCommunity(body: {
  targetType: CommunityTargetType
  targetId: number
  reason: string
}): Promise<ApiResult<CommunityReportResult | null>> {
  const res = await post<Record<string, unknown>>(endpoints.core.problem.report, body)
  if (!res.success) return { ...res, data: null }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  const data = (raw.data ?? res.data) as Record<string, unknown> | null
  if (!data) return { ...res, data: null }
  return {
    ...res,
    data: {
      id: num(data.id),
      alreadyReported: Boolean(data.alreadyReported),
    },
  }
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
