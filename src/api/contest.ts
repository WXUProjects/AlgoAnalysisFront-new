import {
  endpoints,
  type ContestItem,
  type ContestRankingItem,
  type Platform,
} from '@shared/api'
import { get, num, str, type ApiResult } from '@/lib/http'

export interface ContestListData {
  list: ContestItem[]
  total: number
}

export interface ContestRankingData {
  contest: Partial<ContestItem> | null
  list: ContestRankingItem[]
  total: number
}

function normalizeContest(raw: Record<string, unknown>): ContestItem {
  return {
    id: num(raw.id),
    platform: str(raw.platform) as Platform,
    userId: num(raw.userId),
    contestId: str(raw.contestId),
    contestName: str(raw.contestName),
    contestUrl: str(raw.contestUrl),
    rank: num(raw.rank),
    totalCount: num(raw.totalCount),
    acCount: num(raw.acCount),
    time: str(raw.time),
  }
}

function normalizeRank(r: Record<string, unknown>): ContestRankingItem {
  return {
    rank: num(r.rank),
    userId: num(r.userId),
    name: str(r.name),
    avatar: str(r.avatar),
    score: num(r.score ?? r.acCount),
    acCount: num(r.acCount),
    totalCount: num(r.totalCount),
  }
}

export async function listContests(params: {
  userId: number
  limit?: number
  offset?: number
}): Promise<ApiResult<ContestListData>> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.contest.list, {
    userId: params.userId,
    limit: params.limit ?? 10,
    offset: params.offset ?? 0,
  })
  if (!res.success) return { ...res, data: null }
  const list = Array.isArray(res.data) ? res.data.map(normalizeContest) : []
  const raw = (res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: { list, total: num(raw.total, list.length) },
  }
}

export async function getContestRanking(params: {
  contestId: string | number
  limit?: number
  offset?: number
  groupId?: number
}): Promise<ApiResult<ContestRankingData>> {
  const res = await get<unknown>(endpoints.core.contest.ranking, {
    contest_id: params.contestId,
    contestId: params.contestId,
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    ...(params.groupId !== undefined ? { groupId: params.groupId } : {}),
  })
  if (!res.success) return { ...res, data: null }

  // 真实形态: { code, message, contest, data: RankItem[], total? }
  const raw = (res.raw ?? {}) as Record<string, unknown>
  let listRaw: Record<string, unknown>[] = []
  let contestRaw: Record<string, unknown> | null = null

  if (Array.isArray(res.data)) {
    listRaw = res.data as Record<string, unknown>[]
    contestRaw = (raw.contest as Record<string, unknown>) || null
  } else if (res.data && typeof res.data === 'object') {
    const d = res.data as Record<string, unknown>
    if (Array.isArray(d.list)) listRaw = d.list as Record<string, unknown>[]
    else if (Array.isArray(d.ranking)) listRaw = d.ranking as Record<string, unknown>[]
    else if (Array.isArray(d.data)) listRaw = d.data as Record<string, unknown>[]
    contestRaw =
      (d.contest as Record<string, unknown>) ||
      (raw.contest as Record<string, unknown>) ||
      null
  } else if (Array.isArray(raw.data)) {
    listRaw = raw.data as Record<string, unknown>[]
    contestRaw = (raw.contest as Record<string, unknown>) || null
  }

  const list = listRaw.map(normalizeRank)
  return {
    ...res,
    data: {
      contest: contestRaw ? normalizeContest(contestRaw) : null,
      list,
      total: num(raw.total, list.length),
    },
  }
}
