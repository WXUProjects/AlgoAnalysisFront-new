import {
  endpoints,
  type ContestBoardCell,
  type ContestBoardData,
  type ContestBoardProblemCol,
  type ContestBoardRow,
  type ContestCellSubmitItem,
  type ContestCellSubmitsData,
  type ContestItem,
  type ContestProblemItem,
  type ContestProblemsData,
  type ContestRankingItem,
  type Platform,
} from '@shared/api'
import { get, num, str, bool, type ApiResult } from '@/lib/http'
import { normalizeStaticUrl } from '@/lib/static-url'

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
  const startTime =
    raw.startTime !== undefined && raw.startTime !== null
      ? num(raw.startTime)
      : undefined
  const endTime =
    raw.endTime !== undefined && raw.endTime !== null
      ? num(raw.endTime)
      : undefined
  return {
    id: num(raw.id),
    platform: str(raw.platform) as Platform,
    userId: num(raw.userId),
    userName: str(raw.userName) || undefined,
    contestId: str(raw.contestId),
    contestName: str(raw.contestName),
    contestUrl: str(raw.contestUrl),
    rank: num(raw.rank),
    totalCount: num(raw.totalCount),
    acCount: num(raw.acCount),
    time: str(raw.time),
    startTime: startTime || undefined,
    endTime: endTime || undefined,
  }
}

function normalizeRank(r: Record<string, unknown>): ContestRankingItem {
  return {
    rank: num(r.rank),
    userId: num(r.userId),
    name: str(r.name),
    avatar: normalizeStaticUrl(str(r.avatar)),
    score: num(r.score ?? r.acCount),
    acCount: num(r.acCount),
    totalCount: num(r.totalCount),
  }
}

export async function listContests(params: {
  userId: number
  limit?: number
  offset?: number
  platform?: string
  /** 比赛名称 / 场次 ID 关键字 */
  keyword?: string
  /** 时间下界 unix 秒（含） */
  timeFrom?: number
  /** 时间上界 unix 秒（含） */
  timeTo?: number
}): Promise<ApiResult<ContestListData>> {
  const res = await get<Record<string, unknown>[]>(endpoints.core.contest.list, {
    userId: params.userId,
    limit: params.limit ?? 10,
    offset: params.offset ?? 0,
    ...(params.platform ? { platform: params.platform } : {}),
    ...(params.keyword ? { keyword: params.keyword } : {}),
    ...(params.timeFrom ? { timeFrom: params.timeFrom } : {}),
    ...(params.timeTo ? { timeTo: params.timeTo } : {}),
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
  followingOnly?: boolean
}): Promise<ApiResult<ContestRankingData>> {
  const res = await get<unknown>(endpoints.core.contest.ranking, {
    contest_id: params.contestId,
    contestId: params.contestId,
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
    ...(params.groupId !== undefined ? { groupId: params.groupId } : {}),
    ...(params.followingOnly ? { followingOnly: true } : {}),
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

function normalizeContestProblem(r: Record<string, unknown>): ContestProblemItem {
  const tags = Array.isArray(r.tags) ? r.tags.map((t) => str(t)) : []
  return {
    label: str(r.label),
    externalId: str(r.externalId),
    title: str(r.title),
    url: str(r.url),
    problemId: num(r.problemId),
    sortOrder: num(r.sortOrder),
    status: str(r.status),
    hasContent: bool(r.hasContent),
    difficulty: str(r.difficulty),
    tags,
  }
}

function normalizeBoardCell(r: Record<string, unknown>): ContestBoardCell {
  return {
    label: str(r.label),
    externalId: str(r.externalId) || undefined,
    status: str(r.status) || 'NONE',
    attempts: num(r.attempts),
    relativeSec:
      r.relativeSec !== undefined && r.relativeSec !== null
        ? num(r.relativeSec)
        : undefined,
    firstAcAt:
      r.firstAcAt !== undefined && r.firstAcAt !== null
        ? num(r.firstAcAt)
        : undefined,
    scoreDelta:
      r.scoreDelta !== undefined && r.scoreDelta !== null
        ? num(r.scoreDelta)
        : undefined,
  }
}

function normalizeBoardRow(r: Record<string, unknown>): ContestBoardRow {
  const cellsRaw = Array.isArray(r.cells)
    ? (r.cells as Record<string, unknown>[])
    : []
  return {
    userId: num(r.userId),
    name: str(r.name),
    avatar: normalizeStaticUrl(str(r.avatar)),
    rankOfficial: num(r.rankOfficial),
    rankLocal: num(r.rankLocal),
    solved: num(r.solved),
    penaltySec: num(r.penaltySec),
    score: num(r.score),
    acCount: num(r.acCount),
    hasDetail: r.hasDetail === undefined ? undefined : bool(r.hasDetail),
    cells: cellsRaw.map(normalizeBoardCell),
  }
}

/** XCPCIO 风格站内榜 */
export async function getContestBoard(params: {
  contestId: string | number
  groupId?: number
  followingOnly?: boolean
}): Promise<ApiResult<ContestBoardData>> {
  const res = await get<Record<string, unknown>>(endpoints.core.contest.board, {
    id: params.contestId,
    contestId: params.contestId,
    ...(params.groupId !== undefined ? { groupId: params.groupId } : {}),
    ...(params.followingOnly ? { followingOnly: true } : {}),
  })
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  const problemsRaw = Array.isArray(raw.problems)
    ? (raw.problems as Record<string, unknown>[])
    : []
  const rowsRaw = Array.isArray(raw.rows)
    ? (raw.rows as Record<string, unknown>[])
    : []
  const contestRaw = (raw.contest as Record<string, unknown>) || null
  const problems: ContestBoardProblemCol[] = problemsRaw.map((p) => ({
    label: str(p.label),
    externalId: str(p.externalId),
    title: str(p.title),
  }))
  return {
    ...res,
    data: {
      contest: contestRaw ? normalizeContest(contestRaw) : null,
      scoring: str(raw.scoring) || 'icpc',
      hasCellDetail:
        raw.hasCellDetail === undefined ? undefined : bool(raw.hasCellDetail),
      problems,
      rows: rowsRaw.map(normalizeBoardRow),
      total: num(raw.total, rowsRaw.length),
    },
  }
}

/** 站内榜格子：用户本场该题赛时提交明细 */
export async function getContestCellSubmits(params: {
  contestId: string | number
  userId: number
  label?: string
  externalId?: string
}): Promise<ApiResult<ContestCellSubmitsData>> {
  const res = await get<Record<string, unknown>>(
    endpoints.core.contest.cellSubmits,
    {
      id: params.contestId,
      contestId: params.contestId,
      userId: params.userId,
      ...(params.label ? { label: params.label } : {}),
      ...(params.externalId ? { externalId: params.externalId } : {}),
    },
  )
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  const listRaw = Array.isArray(raw.list)
    ? (raw.list as Record<string, unknown>[])
    : []
  const contestRaw = (raw.contest as Record<string, unknown>) || null
  const list: ContestCellSubmitItem[] = listRaw.map((r) => ({
    id: num(r.id),
    submitId: str(r.submitId),
    status: str(r.status),
    lang: str(r.lang),
    time: num(r.time),
    relativeSec:
      r.relativeSec !== undefined && r.relativeSec !== null
        ? num(r.relativeSec)
        : undefined,
    problem: str(r.problem),
    contest: str(r.contest),
    externalId: str(r.externalId) || undefined,
    platform: str(r.platform) || undefined,
    problemId:
      r.problemId !== undefined && r.problemId !== null
        ? num(r.problemId)
        : undefined,
  }))
  return {
    ...res,
    data: {
      contest: contestRaw ? normalizeContest(contestRaw) : null,
      platform: str(raw.platform),
      contestId: str(raw.contestId),
      userId: num(raw.userId),
      userName: str(raw.userName),
      label: str(raw.label),
      externalId: str(raw.externalId),
      startTime:
        raw.startTime !== undefined && raw.startTime !== null
          ? num(raw.startTime)
          : undefined,
      endTime:
        raw.endTime !== undefined && raw.endTime !== null
          ? num(raw.endTime)
          : undefined,
      list,
      total: num(raw.total, list.length),
    },
  }
}

/** 比赛题目目录；首次打开会触发 ensure（每场只跑一次） */
export async function getContestProblems(
  contestLogId: string | number,
): Promise<ApiResult<ContestProblemsData>> {
  const res = await get<Record<string, unknown>>(endpoints.core.contest.problems, {
    id: contestLogId,
    contestId: contestLogId,
  })
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  const listRaw = Array.isArray(raw.list)
    ? (raw.list as Record<string, unknown>[])
    : []
  const contestRaw = (raw.contest as Record<string, unknown>) || null
  return {
    ...res,
    data: {
      contest: contestRaw ? normalizeContest(contestRaw) : null,
      ensureStatus: str(raw.ensureStatus),
      ensureError: str(raw.ensureError),
      list: listRaw.map(normalizeContestProblem),
    },
  }
}
