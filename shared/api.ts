/**
 * CWXU-Algo 后端 API 路径常量与类型
 * 前端请求使用 /api 前缀（Vite 反代到 https://algo.zhiyuansofts.cn/api）
 */

export const API_PREFIX = '/api'

export const endpoints = {
  user: {
    auth: {
      login: `${API_PREFIX}/user/auth/login`,
      register: `${API_PREFIX}/user/auth/register`,
    },
    profile: {
      getById: `${API_PREFIX}/user/profile/get-by-id`,
      getByName: `${API_PREFIX}/user/profile/get-by-name`,
      list: `${API_PREFIX}/user/profile/list`,
      update: `${API_PREFIX}/user/profile/update`,
      moveGroup: `${API_PREFIX}/user/profile/move-group`,
      setEmailEnabled: `${API_PREFIX}/user/profile/set-email-enabled`,
      idsByGroup: `${API_PREFIX}/user/profile/ids-by-group`,
      getByIds: `${API_PREFIX}/user/profile/get-by-ids`,
      delete: `${API_PREFIX}/user/profile/delete`,
    },
    group: {
      create: `${API_PREFIX}/user/group/create`,
      delete: `${API_PREFIX}/user/group/delete`,
      update: `${API_PREFIX}/user/group/update`,
      get: `${API_PREFIX}/user/group/get`,
      list: `${API_PREFIX}/user/group/list`,
    },
    role: {
      list: `${API_PREFIX}/user/role/list`,
      setUserRole: `${API_PREFIX}/user/role/set-user-role`,
    },
  },
  core: {
    submitLog: {
      getById: `${API_PREFIX}/core/submit-log/get-by-id`,
    },
    spider: {
      set: `${API_PREFIX}/core/spider/set`,
      update: `${API_PREFIX}/core/spider/update`,
      updateAll: `${API_PREFIX}/core/spider/update-all`,
    },
    statistic: {
      heatmap: `${API_PREFIX}/core/statistic/heatmap`,
      period: `${API_PREFIX}/core/statistic/period`,
      rank: `${API_PREFIX}/core/statistic/rank`,
    },
    contest: {
      list: `${API_PREFIX}/core/contest/list`,
      history: `${API_PREFIX}/core/contest/history`,
      ranking: `${API_PREFIX}/core/contest/ranking`,
    },
    bulletin: {
      create: `${API_PREFIX}/core/bulletin/create`,
      update: `${API_PREFIX}/core/bulletin/update`,
      delete: `${API_PREFIX}/core/bulletin/delete`,
      get: `${API_PREFIX}/core/bulletin/get`,
      list: `${API_PREFIX}/core/bulletin/list`,
    },
    problem: {
      list: `${API_PREFIX}/core/problem/list`,
      tags: `${API_PREFIX}/core/problem/tags`,
      get: `${API_PREFIX}/core/problem/get`,
      submissions: `${API_PREFIX}/core/problem/submissions`,
      userProfile: `${API_PREFIX}/core/problem/user-profile`,
      progress: `${API_PREFIX}/core/problem/progress`,
      backfill: `${API_PREFIX}/core/problem/backfill`,
      emergencyStop: `${API_PREFIX}/core/problem/emergency-stop`,
      resetAll: `${API_PREFIX}/core/problem/reset-all`,
      resetQueues: `${API_PREFIX}/core/problem/reset-queues`,
      resume: `${API_PREFIX}/core/problem/resume`,
      retryFailed: `${API_PREFIX}/core/problem/retry-failed`,
      toggleAnalyze: `${API_PREFIX}/core/problem/toggle-analyze`,
      toggleFetch: `${API_PREFIX}/core/problem/toggle-fetch`,
    },
  },
  agent: {
    summary: {
      recent: `${API_PREFIX}/agent/summary/recent`,
    },
  },
} as const

export type Platform =
  | 'NowCoder'
  | 'AtCoder'
  | 'CodeForces'
  | 'LuoGu'
  | 'LeetCode'
  | 'QOJ'

export interface StdResponse<T = unknown> {
  message: string
  success: boolean
  data: T
}

export interface LoginReq {
  username: string
  password: string
}

export interface LoginRes {
  success: boolean
  message: string
  jwtToken: string
}

export interface RegisterReq {
  username: string
  password: string
  name: string
  email: string
  groupId: number
}

export interface RegisterRes {
  success: boolean
  message: string
}

export interface SpiderBinding {
  platform: string
  username: string
}

export interface UserProfile {
  userId: number
  username: string
  name: string
  email: string
  groupId: number
  avatar: string
  emailEnabled?: boolean
  roleId?: number
  spiders: SpiderBinding[]
}

export interface UserListItem {
  userId: number
  username: string
  name: string
  groupId: number
  avatar: string
  lastSubmit: string
  roleId?: number
}

export interface UserListRes {
  list: UserListItem[]
  total: number
}

export interface GroupInfo {
  id: number
  name: string
  describe: string
  users?: UserListItem[]
}

export interface RoleInfo {
  roleId: number
  name: string
}

export interface SubmitLogItem {
  id: number
  contest: string
  lang: string
  platform: Platform
  problem: string
  status: string
  submitId: string
  time: string
  userId: number
  problemId?: number
  /** 后端批量填充，避免前端 N+1 profile */
  userName?: string
  /** 题库标题，有 problemId 时由后端批量填充 */
  problemTitle?: string
  /** 题库 AI 标签，有 problemId 时由后端批量填充 */
  problemTags?: string[]
}

export interface HeatmapItem {
  count: number
  date: string
}

export interface PeriodItem {
  today: number
  thisWeek: number
  lastWeek: number
  thisMonth: number
  lastMonth: number
  thisYear: number
  lastYear: number
  total: number
}

export interface PeriodData {
  ac: PeriodItem
  submit: PeriodItem
}

export interface ContestItem {
  id: number
  platform: Platform
  userId: number
  contestId: string
  contestName: string
  contestUrl: string
  rank: number
  totalCount: number
  acCount: number
  time: string
}

export interface ContestRankingItem {
  rank: number
  userId: number
  name: string
  avatar: string
  score: number
  acCount: number
  totalCount: number
}

export interface BulletinInfo {
  id: number
  title: string
  content: string
  authorId: number
  authorName: string
  isPinned: boolean
  createdAt: number
  updatedAt: number
}

export interface SolutionMeta {
  name: string
  timeComplexity: string
  spaceComplexity: string
  briefExplanation: string
}

export interface ProblemInfo {
  id: number
  platform: string
  externalId: string
  title: string
  url: string
  contentMd: string
  problemType: string
  tags: string[]
  solutions: SolutionMeta[]
  difficulty: string
  status: string
  errorMsg: string
  lastSubmittedAt: number
  userStatus: string
}

export interface ProblemListRes {
  data: ProblemInfo[]
  total: number
  page: number
  pageSize: number
}

export interface ProblemUserProfile {
  radar: { tag: string; score: number; acCount: number }[]
  platforms: { name: string; count: number }[]
  difficulties: { name: string; count: number }[]
  totalAc: number
}

export interface AgentSummaryData {
  msg: string[]
  updateTime: string
}
