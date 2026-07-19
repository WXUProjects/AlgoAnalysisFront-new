import type { ContestItem } from '@shared/api'

/** React Router location.state for list → contest detail */
export type ContestLocationState = {
  contest?: Partial<ContestItem>
}

/** Header fields enough to paint detail chrome before board API returns */
export function contestSeedFromItem(
  item: Partial<ContestItem>,
): Partial<ContestItem> {
  return {
    id: item.id,
    platform: item.platform,
    contestId: item.contestId,
    contestName: item.contestName,
    contestUrl: item.contestUrl,
    totalCount: item.totalCount,
    time: item.time,
    startTime: item.startTime,
    endTime: item.endTime,
  }
}

/** Session fallback when location.state is missing (e.g. some navigate paths) */
let remembered: Partial<ContestItem> | null = null

export function rememberContestSeed(item: Partial<ContestItem>): void {
  remembered = contestSeedFromItem(item)
}

export function readContestSeed(
  id: string | number | undefined,
  state: unknown,
): Partial<ContestItem> | null {
  if (id == null || id === '') return null
  const idStr = String(id)

  const fromState = (state as ContestLocationState | null | undefined)?.contest
  if (fromState) {
    if (fromState.id == null || String(fromState.id) === idStr) {
      return contestSeedFromItem({ ...fromState, id: fromState.id ?? Number(id) })
    }
  }

  if (remembered && (remembered.id == null || String(remembered.id) === idStr)) {
    return contestSeedFromItem({
      ...remembered,
      id: remembered.id ?? Number(id),
    })
  }

  return null
}

/** Merge API contest over seed; never blank out a known name with empty API fields */
export function mergeContestMeta(
  prev: Partial<ContestItem> | null,
  next: Partial<ContestItem> | null | undefined,
): Partial<ContestItem> | null {
  if (!next) return prev
  if (!prev) return next
  return {
    ...prev,
    ...next,
    contestName: next.contestName || prev.contestName,
    platform: next.platform || prev.platform,
    contestUrl: next.contestUrl || prev.contestUrl,
    contestId: next.contestId || prev.contestId,
    totalCount:
      next.totalCount && next.totalCount > 0
        ? next.totalCount
        : prev.totalCount,
    time: next.time || prev.time,
    startTime: next.startTime || prev.startTime,
    endTime: next.endTime || prev.endTime,
  }
}
