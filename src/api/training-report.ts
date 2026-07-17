import {
  endpoints,
  type StartTrainingReportReq,
  type TrainingReportJob,
} from '@shared/api'
import { get, post, num, str, type ApiResult } from '@/lib/http'
import { jwt } from '@/lib/jwt'

function normalizeJob(raw: Record<string, unknown> | null | undefined): TrainingReportJob | null {
  if (!raw || typeof raw !== 'object') return null
  const jobId = str(raw.jobId ?? raw.job_id)
  if (!jobId) return null
  return {
    jobId,
    status: str(raw.status, 'pending'),
    progress: num(raw.progress),
    message: str(raw.message),
    startDate: str(raw.startDate ?? raw.start_date),
    endDate: str(raw.endDate ?? raw.end_date),
    groupId: num(raw.groupId ?? raw.group_id),
    useAi: Boolean(raw.useAi ?? raw.use_ai),
    orgId: num(raw.orgId ?? raw.org_id),
    createdBy: num(raw.createdBy ?? raw.created_by),
    createdAt: num(raw.createdAt ?? raw.created_at),
    finishedAt: num(raw.finishedAt ?? raw.finished_at),
    expiresAt: num(raw.expiresAt ?? raw.expires_at),
    downloadable: Boolean(raw.downloadable),
    errorDetail: str(raw.errorDetail ?? raw.error_detail),
    fileName: str(raw.fileName ?? raw.file_name),
  }
}

export async function startTrainingReport(
  body: StartTrainingReportReq,
): Promise<ApiResult<{ jobId: string }>> {
  const res = await post<Record<string, unknown>>(endpoints.agent.trainingReport.start, body)
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  if (typeof raw.code === 'number' && raw.code !== 0) {
    return {
      success: false,
      message: str(raw.msg ?? raw.message, res.message || '创建失败，请稍后重试'),
      data: null,
    }
  }
  const jobId = str(raw.jobId ?? raw.job_id)
  if (!jobId) {
    return {
      success: false,
      message: res.message || '未返回任务编号',
      data: null,
    }
  }
  return { success: true, message: str(raw.msg, '已开始生成'), data: { jobId } }
}

export async function getTrainingReportJob(
  jobId: string,
): Promise<ApiResult<TrainingReportJob>> {
  const res = await get<Record<string, unknown>>(endpoints.agent.trainingReport.job, { jobId })
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  if (typeof raw.code === 'number' && raw.code !== 0) {
    return {
      success: false,
      message: str(raw.msg ?? raw.message, res.message || '查询失败'),
      data: null,
    }
  }
  const job = normalizeJob((raw.job as Record<string, unknown>) ?? raw)
  if (!job) {
    return { success: false, message: '任务不存在', data: null }
  }
  return { success: true, message: 'ok', data: job }
}

export async function listTrainingReportJobs(params?: {
  orgId?: number
  limit?: number
}): Promise<ApiResult<TrainingReportJob[]>> {
  const res = await get<Record<string, unknown>>(endpoints.agent.trainingReport.jobs, {
    orgId: params?.orgId,
    limit: params?.limit ?? 10,
  })
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  if (typeof raw.code === 'number' && raw.code !== 0) {
    return {
      success: false,
      message: str(raw.msg ?? raw.message, res.message || '加载失败'),
      data: null,
    }
  }
  const listRaw = Array.isArray(raw.jobs) ? raw.jobs : []
  const list = listRaw
    .map((j) => normalizeJob(j as Record<string, unknown>))
    .filter((j): j is TrainingReportJob => !!j)
  return { success: true, message: 'ok', data: list }
}

/** 浏览器直接下载（Cookie + access_token 兜底） */
export function downloadTrainingReport(
  jobId: string,
  format: 'pdf' | 'html' = 'pdf',
): ApiResult<null> {
  if (!jwt.isValid()) {
    return { success: false, message: '请先登录后再下载', data: null }
  }
  const url = new URL(endpoints.agent.trainingReport.download, window.location.origin)
  url.searchParams.set('jobId', jobId)
  url.searchParams.set('format', format)
  url.searchParams.set('access_token', jwt.token)
  const a = document.createElement('a')
  a.href = url.pathname + url.search
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  return { success: true, message: 'ok', data: null }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return '排队中'
    case 'running':
      return '生成中'
    case 'done':
      return '已完成'
    case 'failed':
      return '失败'
    case 'expired':
      return '已过期'
    default:
      return status || '未知'
  }
}
