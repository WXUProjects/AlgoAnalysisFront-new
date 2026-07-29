import {
  endpoints,
  type BlogReportAdminItem,
  type CommunityReportAdminItem,
  type CommunityTargetType,
  type ReportHandleAction,
  type ReportStatus,
} from '@shared/api'
import { get, post, num, str, parseListResponse, type ApiResult } from '@/lib/http'

/** 举报处理台 API（需 content.report.handle）。 */

export type ReportStatusFilter = ReportStatus | 'all'

function normReporter(raw: unknown): { userId: number; username: string } {
  const r = (raw ?? {}) as Record<string, unknown>
  return { userId: num(r.userId), username: str(r.username) }
}

function normBlogReport(raw: Record<string, unknown>): BlogReportAdminItem {
  const t = (raw.target ?? {}) as Record<string, unknown>
  return {
    id: num(raw.id),
    createdAt: num(raw.createdAt),
    status: str(raw.status) as ReportStatus,
    reason: str(raw.reason),
    articleId: num(raw.articleId),
    reporter: normReporter(raw.reporter),
    target: {
      exists: Boolean(t.exists),
      slug: str(t.slug) || undefined,
      title: str(t.title) || undefined,
      authorUserId: num(t.authorUserId) || undefined,
      authorUsername: str(t.authorUsername) || undefined,
    },
  }
}

function normCommunityReport(
  raw: Record<string, unknown>,
): CommunityReportAdminItem {
  const t = (raw.target ?? {}) as Record<string, unknown>
  return {
    id: num(raw.id),
    createdAt: str(raw.createdAt),
    status: str(raw.status) as ReportStatus,
    reason: str(raw.reason),
    targetType: str(raw.targetType) as CommunityTargetType,
    targetId: num(raw.targetId),
    reporter: normReporter(raw.reporter),
    target: {
      exists: Boolean(t.exists),
      problemId: num(t.problemId) || undefined,
      solutionId: num(t.solutionId) || undefined,
      title: str(t.title) || undefined,
      excerpt: str(t.excerpt) || undefined,
      authorUserId: num(t.authorUserId) || undefined,
      authorUsername: str(t.authorUsername) || undefined,
    },
  }
}

/** 博客文章举报列表 */
export async function listBlogReports(params: {
  status?: ReportStatusFilter
  page?: number
  pageSize?: number
}): Promise<ApiResult<{ list: BlogReportAdminItem[]; total: number } | null>> {
  const res = await get<Record<string, unknown>>(
    endpoints.user.blog.reportList,
    params,
  )
  if (!res.success || !res.data) return { ...res, data: null }
  const parsed = parseListResponse(res.data, normBlogReport)
  return {
    ...res,
    data: { list: parsed.list, total: parsed.total },
  }
}

/** 处理博客举报：resolve=已处理 / dismiss=驳回 */
export async function handleBlogReport(body: {
  id: number
  action: ReportHandleAction
}): Promise<ApiResult<null>> {
  const res = await post(endpoints.user.blog.reportHandle, body)
  return { ...res, data: null }
}

/** 题解/评论举报列表 */
export async function listCommunityReports(params: {
  status?: ReportStatusFilter
  targetType?: CommunityTargetType
  page?: number
  pageSize?: number
}): Promise<
  ApiResult<{ list: CommunityReportAdminItem[]; total: number } | null>
> {
  const res = await get<Record<string, unknown>>(
    endpoints.core.problem.reportList,
    params,
  )
  if (!res.success || !res.data) return { ...res, data: null }
  const parsed = parseListResponse(res.data, normCommunityReport)
  return {
    ...res,
    data: { list: parsed.list, total: parsed.total },
  }
}

/** 处理题解/评论举报：resolve=已处理 / dismiss=驳回 */
export async function handleCommunityReport(body: {
  id: number
  action: ReportHandleAction
}): Promise<ApiResult<null>> {
  const res = await post(endpoints.core.problem.reportHandle, body)
  return { ...res, data: null }
}
