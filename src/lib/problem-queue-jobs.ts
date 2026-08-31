type JobRow = Record<string, unknown>

function jobId(row: JobRow): number {
  return Number(row.problemId ?? row.id) || 0
}

export function queuedProblemJobs(
  inProgress: JobRow[],
  activeJobs: JobRow[],
): JobRow[] {
  const activeIds = new Set(activeJobs.map(jobId).filter(Boolean))
  return inProgress.flatMap((row) => {
    const id = jobId(row)
    if (!id || activeIds.has(id)) return []
    const status = String(row.status || '')
    const queueLabel = status === 'FETCHING'
      ? '题面获取 · 排队中'
      : status === 'TAGGING'
        ? 'AI 分析 · 排队中'
        : ''
    return queueLabel ? [{ ...row, id, queued: true, queueLabel }] : []
  })
}
