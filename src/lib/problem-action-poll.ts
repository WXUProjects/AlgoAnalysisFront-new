export interface ReanalysisSnapshot {
  status: string
  analyzedAt?: number | null
}

export function isFreshReanalysisCompletion(
  snapshot: ReanalysisSnapshot,
  previousAnalyzedAt: number,
  requestedAt: number,
): boolean {
  const analyzedAt = Number(snapshot.analyzedAt) || 0
  return (
    snapshot.status === 'COMPLETED' &&
    analyzedAt > previousAnalyzedAt &&
    analyzedAt >= requestedAt
  )
}
