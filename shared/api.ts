/**
 * CWXU-Algo 后端 API 路径常量与类型
 * 前端请求使用 /api 前缀（Vite 反代到 https://algo.zhiyuansofts.cn/api）
 */

export const API_PREFIX = '/api'

export const endpoints = {
  user: {
    auth: {
      login: `${API_PREFIX}/user/auth/login`,
      logout: `${API_PREFIX}/user/auth/logout`,
      register: `${API_PREFIX}/user/auth/register`,
      refresh: `${API_PREFIX}/user/auth/refresh`,
      sendCode: `${API_PREFIX}/user/auth/send-code`,
      resetPassword: `${API_PREFIX}/user/auth/reset-password`,
      changePassword: `${API_PREFIX}/user/auth/change-password`,
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
      nonPublicOrgUserIds: `${API_PREFIX}/user/profile/non-public-org-user-ids`,
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
    upload: `${API_PREFIX}/user/upload`,
    site: {
      config: `${API_PREFIX}/user/site/config`,
      adminConfig: `${API_PREFIX}/user/site/admin-config`,
      testEmail: `${API_PREFIX}/user/site/test-email`,
      visitPing: `${API_PREFIX}/user/site/visit-ping`,
      accessStats: `${API_PREFIX}/user/site/access-stats`,
      backup: {
        export: `${API_PREFIX}/user/site/backup/export`,
        import: `${API_PREFIX}/user/site/backup/import`,
        jobs: `${API_PREFIX}/user/site/backup/jobs`,
        job: (id: number | string) =>
          `${API_PREFIX}/user/site/backup/jobs/${id}`,
        download: (id: number | string) =>
          `${API_PREFIX}/user/site/backup/jobs/${id}/download`,
      },
    },
    org: {
      list: `${API_PREFIX}/user/org/list`,
      get: `${API_PREFIX}/user/org/get`,
      create: `${API_PREFIX}/user/org/create`,
      update: `${API_PREFIX}/user/org/update`,
      delete: `${API_PREFIX}/user/org/delete`,
      switch: `${API_PREFIX}/user/org/switch`,
      join: `${API_PREFIX}/user/org/join`,
      leave: `${API_PREFIX}/user/org/leave`,
      members: `${API_PREFIX}/user/org/members`,
      setRole: `${API_PREFIX}/user/org/members/set-role`,
      removeMember: `${API_PREFIX}/user/org/members/remove`,
      addMember: `${API_PREFIX}/user/org/members/add`,
      setDisplayName: `${API_PREFIX}/user/org/members/set-display-name`,
      memberIds: `${API_PREFIX}/user/org/member-ids`,
      invite: `${API_PREFIX}/user/org/invite`,
      inviteRotate: `${API_PREFIX}/user/org/invite/rotate`,
      joinRequests: `${API_PREFIX}/user/org/join-requests`,
      joinReview: `${API_PREFIX}/user/org/join-requests/review`,
    },
    profileIdsByOrg: `${API_PREFIX}/user/profile/ids-by-org`,
    platform: {
      setSiteAdmin: `${API_PREFIX}/user/platform/set-site-admin`,
    },
    paste: {
      create: `${API_PREFIX}/user/paste/create`,
      get: `${API_PREFIX}/user/paste/get`,
      mine: `${API_PREFIX}/user/paste/mine`,
      delete: `${API_PREFIX}/user/paste/delete`,
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
    emergency: {
      create: `${API_PREFIX}/core/emergency/create`,
      update: `${API_PREFIX}/core/emergency/update`,
      delete: `${API_PREFIX}/core/emergency/delete`,
      list: `${API_PREFIX}/core/emergency/list`,
      active: `${API_PREFIX}/core/emergency/active`,
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
  /** 用户名或邮箱 */
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
  /** 邮箱验证码 */
  code: string
}

export interface RegisterRes {
  success: boolean
  message: string
}

/** purpose: register | reset */
export interface SendCodeReq {
  email: string
  purpose: 'register' | 'reset'
}

export interface SendCodeRes {
  success: boolean
  message: string
}

export interface ResetPasswordReq {
  email: string
  code: string
  /** 客户端 SHA256 后的新密码 */
  password: string
}

export interface ResetPasswordRes {
  success: boolean
  message: string
}

export interface ChangePasswordReq {
  /** 客户端 SHA256 后的当前密码 */
  oldPassword: string
  /** 客户端 SHA256 后的新密码 */
  newPassword: string
}

export interface ChangePasswordRes {
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
  emailWeeklyEnabled?: boolean
  emailAllowedByOrg?: boolean
  emailWeeklyAllowedByOrg?: boolean
  roleId?: number
  spiders: SpiderBinding[]
}

export interface UserOrgBrief {
  orgId: number
  name: string
  role: string
}

export interface UserListItem {
  userId: number
  username: string
  name: string
  groupId: number
  groupName?: string
  avatar: string
  lastSubmit: string
  roleId?: number
  isSiteAdmin?: boolean
  orgs?: UserOrgBrief[]
  /** 个人日报邮件偏好 */
  emailEnabled?: boolean
  /** 个人周报邮件偏好 */
  emailWeeklyEnabled?: boolean
  /** 是否有组织授权日报（可开启） */
  emailAllowedByOrg?: boolean
  /** 是否有组织授权周报且为 staff（可开启） */
  emailWeeklyAllowedByOrg?: boolean
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

/** 组织（GoAlgo 多租户） */
export interface OrgInfo {
  id: number
  name: string
  slug: string
  plan?: string
  /** 用户数上限（默认 50）；公共域仅计「只属于公共域」的用户 */
  seatLimit?: number
  /** 当前占用席位数（公共域按仅属公共域规则） */
  memberCount?: number
  status?: string
  isSystem?: boolean
  brandTitle?: string
  brandLogo?: string
  brandFavicon?: string
  joinMode?: 'auto' | 'review' | string
  inviteCode?: string
  enableAiSummary?: boolean
  enableAiEmail?: boolean
  enableAiWeeklyEmail?: boolean
  enableSpider?: boolean
  spiderIntervalMin?: number
  aiSummaryIntervalMin?: number
  aiEmailSchedule?: string
  myRole?: 'member' | 'coach' | 'captain' | 'org_admin' | string
  /** 我在该组织内的对外称呼（org_members.org_display_name） */
  orgDisplayName?: string
  isCurrent?: boolean
}

export interface OrgMemberInfo {
  userId: number
  username: string
  /** 组织内展示名（org_display_name，空则 username） */
  name: string
  /** 组织内名称 org_members.org_display_name */
  orgDisplayName?: string
  avatar?: string
  role: string
  groupId?: number | null
  joinedAt?: number
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
  /** 题库难度（简单/中等/困难），有 problemId 时由后端批量填充 */
  problemDifficulty?: string
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
  /** 去重：累计题数（AC）或累计提交（submit） */
  total: number
  /** 仅 AC：累计 AC 次数（不去重）；submit 无此字段 */
  totalRaw?: number
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

export interface EmergencyInfo {
  id: number
  title: string
  content: string
  enabled: boolean
  sortOrder: number
  authorId: number
  authorName: string
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

/** Pastebin 粘贴板 */
export type PasteExpire = 'never' | '1h' | '1d' | '1w' | '1m' | '1y'

export interface PasteInfo {
  id: number
  slug: string
  title: string
  content?: string
  language: string
  userId: number
  createdAt: number
  expireAt?: number | null
}

export interface PasteCreateReq {
  title?: string
  content: string
  language?: string
  expire?: PasteExpire
}

/** 站点备份 scope；`all` 表示全量。后续可在 UI 做多选。 */
export type BackupScope =
  | 'all'
  | 'site'
  | 'users'
  | 'orgs'
  | 'pastes'
  | 'visits'
  | 'platforms'
  | 'submits'
  | 'contests'
  | 'problems'
  | 'bulletins'
  | 'emergency'
  | 'daily_stats'
  | 'files'

export type BackupJobKind = 'export' | 'import'
export type BackupJobStatus = 'pending' | 'running' | 'done' | 'failed'

export interface BackupJob {
  id: number
  kind: BackupJobKind | string
  status: BackupJobStatus | string
  scopes: string[]
  progress: number
  message: string
  fileSize: number
  createdBy: number
  errorDetail?: string
  createdAt?: string
  startedAt?: string
  finishedAt?: string
  downloadable: boolean
}
