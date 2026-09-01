type JobRow = Record<string, unknown>

export const PROBLEM_JOBS_PAGE_SIZE = 8

type QueueCounts = {
  fetch?: number
  analyze?: number
}

function jobId(row: JobRow): number {
  return Number(row.problemId ?? row.id) || 0
}

export function queuedProblemJobs(
  inProgress: JobRow[],
  activeJobs: JobRow[],
  queueCounts?: QueueCounts,
): JobRow[] {
  const activeIds = new Set(activeJobs.map(jobId).filter(Boolean))
  const remaining = {
    FETCHING: queueCounts?.fetch ?? Number.POSITIVE_INFINITY,
    TAGGING: queueCounts?.analyze ?? Number.POSITIVE_INFINITY,
  }
  return inProgress.flatMap((row) => {
    const id = jobId(row)
    if (!id || activeIds.has(id)) return []
    const status = String(row.status || '')
    if (status !== 'FETCHING' && status !== 'TAGGING') return []
    if (remaining[status] <= 0) return []
    remaining[status]--
    const pendingLabel = status === 'FETCHING'
      ? '题面获取 · 待处理'
      : 'AI 分析 · 待处理'
    return [{ ...row, id, queued: true, queueLabel: pendingLabel }]
  })
}

export function paginateProblemJobs(
  rows: JobRow[],
  page: number,
): JobRow[] {
  const start = (Math.max(1, page) - 1) * PROBLEM_JOBS_PAGE_SIZE
  return rows.slice(start, start + PROBLEM_JOBS_PAGE_SIZE)
}
