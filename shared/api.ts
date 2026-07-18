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
      getByUsername: `${API_PREFIX}/user/profile/get-by-username`,
      list: `${API_PREFIX}/user/profile/list`,
      update: `${API_PREFIX}/user/profile/update`,
      moveGroup: `${API_PREFIX}/user/profile/move-group`,
      setEmailEnabled: `${API_PREFIX}/user/profile/set-email-enabled`,
      setProblemPipeline: `${API_PREFIX}/user/profile/set-problem-pipeline`,
      setSyncIntervals: `${API_PREFIX}/user/profile/set-sync-intervals`,
      setSyncExempt: `${API_PREFIX}/user/profile/set-sync-exempt`,
      clearDormant: `${API_PREFIX}/user/profile/clear-dormant`,
      idsByGroup: `${API_PREFIX}/user/profile/ids-by-group`,
      getByIds: `${API_PREFIX}/user/profile/get-by-ids`,
      nonPublicOrgUserIds: `${API_PREFIX}/user/profile/non-public-org-user-ids`,
      delete: `${API_PREFIX}/user/profile/delete`,
      followingIds: `${API_PREFIX}/user/profile/following-ids`,
      filterPublicFeedUserIds: `${API_PREFIX}/user/profile/filter-public-feed-user-ids`,
    },
    social: {
      follow: `${API_PREFIX}/user/social/follow`,
      unfollow: `${API_PREFIX}/user/social/unfollow`,
      following: `${API_PREFIX}/user/social/following`,
      followers: `${API_PREFIX}/user/social/followers`,
      counts: `${API_PREFIX}/user/social/counts`,
      relation: `${API_PREFIX}/user/social/relation`,
      search: `${API_PREFIX}/user/social/search`,
      /** 单用户域感知展示名 + 共属组织徽章 */
      identity: `${API_PREFIX}/user/social/identity`,
    },
    privacy: {
      get: `${API_PREFIX}/user/privacy/get`,
      update: `${API_PREFIX}/user/privacy/update`,
      status: `${API_PREFIX}/user/privacy/status`,
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
      discover: `${API_PREFIX}/user/org/discover`,
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
    blog: {
      byUsername: `${API_PREFIX}/user/blog/by-username`,
      articleGet: `${API_PREFIX}/user/blog/article/get`,
      articleUnlock: `${API_PREFIX}/user/blog/article/unlock`,
      articleCreate: `${API_PREFIX}/user/blog/article/create`,
      articleUpdate: `${API_PREFIX}/user/blog/article/update`,
      articleDelete: `${API_PREFIX}/user/blog/article/delete`,
      articleMine: `${API_PREFIX}/user/blog/article/mine`,
      recommend: `${API_PREFIX}/user/blog/recommend`,
      plaza: `${API_PREFIX}/user/blog/plaza`,
      authors: `${API_PREFIX}/user/blog/authors`,
      analytics: `${API_PREFIX}/user/blog/analytics`,
      categories: `${API_PREFIX}/user/blog/categories`,
      categoryMine: `${API_PREFIX}/user/blog/category/mine`,
      categoryCreate: `${API_PREFIX}/user/blog/category/create`,
      categoryUpdate: `${API_PREFIX}/user/blog/category/update`,
      categoryDelete: `${API_PREFIX}/user/blog/category/delete`,
      commentList: `${API_PREFIX}/user/blog/comment/list`,
      commentCreate: `${API_PREFIX}/user/blog/comment/create`,
      commentDelete: `${API_PREFIX}/user/blog/comment/delete`,
      like: `${API_PREFIX}/user/blog/like`,
      themeStatus: `${API_PREFIX}/user/blog/theme/status`,
      themeConfig: `${API_PREFIX}/user/blog/theme/config`,
      themeEnable: `${API_PREFIX}/user/blog/theme/enable`,
      agreement: `${API_PREFIX}/user/blog/agreement`,
      activationStatus: `${API_PREFIX}/user/blog/activation/status`,
      activate: `${API_PREFIX}/user/blog/activate`,
      notifyPref: `${API_PREFIX}/user/blog/notify-pref`,
      adminOverview: `${API_PREFIX}/user/blog/admin/overview`,
      adminAuthors: `${API_PREFIX}/user/blog/admin/authors`,
      adminArticles: `${API_PREFIX}/user/blog/admin/articles`,
      adminModerate: `${API_PREFIX}/user/blog/admin/moderate`,
      report: `${API_PREFIX}/user/blog/report`,
    },
    seo: {
      html: `${API_PREFIX}/user/seo/html`,
      meta: `${API_PREFIX}/user/seo/meta`,
      sitemap: `${API_PREFIX}/user/seo/sitemap.xml`,
    },
    notification: {
      list: `${API_PREFIX}/user/notification/list`,
      unreadCount: `${API_PREFIX}/user/notification/unread-count`,
      read: `${API_PREFIX}/user/notification/read`,
      readAll: `${API_PREFIX}/user/notification/read-all`,
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
      submitInventory: `${API_PREFIX}/core/spider/submit-inventory`,
      purgeSubmitsAndRecrawl: `${API_PREFIX}/core/spider/purge-submits-and-recrawl`,
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
    contestCalendar: {
      list: `${API_PREFIX}/core/contest-calendar/list`,
      platforms: `${API_PREFIX}/core/contest-calendar/platforms`,
      sub: `${API_PREFIX}/core/contest-calendar/sub`,
      subDelete: `${API_PREFIX}/core/contest-calendar/sub/delete`,
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
      reorder: `${API_PREFIX}/core/emergency/reorder`,
    },
    problem: {
      list: `${API_PREFIX}/core/problem/list`,
      tags: `${API_PREFIX}/core/problem/tags`,
      /** 全站热题：近 N 天提交/做题人数/AC 综合热度 */
      hot: `${API_PREFIX}/core/problem/hot`,
      get: `${API_PREFIX}/core/problem/get`,
      submissions: `${API_PREFIX}/core/problem/submissions`,
      followingStatus: `${API_PREFIX}/core/problem/following-status`,
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
      /** 站点管理员直接改标签/题面 */
      adminUpdate: `${API_PREFIX}/core/problem/admin-update`,
      /** 登录用户提交修改申请（站管调用时直存） */
      proposeEdit: `${API_PREFIX}/core/problem/propose-edit`,
      /** 站点管理员审核列表 */
      editRequests: `${API_PREFIX}/core/problem/edit-requests`,
      /** 站点管理员通过/驳回 */
      reviewEdit: `${API_PREFIX}/core/problem/review-edit`,
      /** 当前用户对该题的待审申请 */
      myPendingEdit: `${API_PREFIX}/core/problem/my-pending-edit`,
      /** 题目评论（全站可见；支持层级回复） */
      commentList: `${API_PREFIX}/core/problem/comment/list`,
      commentCreate: `${API_PREFIX}/core/problem/comment/create`,
      commentDelete: `${API_PREFIX}/core/problem/comment/delete`,
      /** 用户题解（全站可见；非 AI solutions） */
      solutionList: `${API_PREFIX}/core/problem/solution/list`,
      solutionGet: `${API_PREFIX}/core/problem/solution/get`,
      solutionCreate: `${API_PREFIX}/core/problem/solution/create`,
      solutionUpdate: `${API_PREFIX}/core/problem/solution/update`,
      solutionDelete: `${API_PREFIX}/core/problem/solution/delete`,
      /** 评论/题解点赞（toggle） */
      like: `${API_PREFIX}/core/problem/like`,
      /** 评论/题解举报 */
      report: `${API_PREFIX}/core/problem/report`,
    },
    activity: {
      /** 发现页动态：公共域全站聚合；私有域按组织隔离 */
      feed: `${API_PREFIX}/core/activity/feed`,
    },
    user: {
      recentComments: `${API_PREFIX}/core/user/recent-comments`,
      recentSolutions: `${API_PREFIX}/core/user/recent-solutions`,
    },
    problemset: {
      /** 我的题单（自动确保收藏/待做）；可选 query problemId → containsProblem */
      mine: `${API_PREFIX}/core/problemset/mine`,
      /** 题单广场（公有自定义） */
      square: `${API_PREFIX}/core/problemset/square`,
      /** 题单详情 query: id, unlockToken? */
      get: `${API_PREFIX}/core/problemset/get`,
      /** 题目关联的公有自定义题单 query: problemId（不含收藏/待做） */
      byProblem: `${API_PREFIX}/core/problemset/by-problem`,
      create: `${API_PREFIX}/core/problemset/create`,
      update: `${API_PREFIX}/core/problemset/update`,
      delete: `${API_PREFIX}/core/problemset/delete`,
      unlock: `${API_PREFIX}/core/problemset/unlock`,
      /** 加题：problemId 或 url */
      add: `${API_PREFIX}/core/problemset/add`,
      remove: `${API_PREFIX}/core/problemset/remove`,
      like: `${API_PREFIX}/core/problemset/like`,
    },
  },
  agent: {
    summary: {
      recent: `${API_PREFIX}/agent/summary/recent`,
    },
    trainingReport: {
      /** 发起组织训练报告（异步） */
      start: `${API_PREFIX}/agent/training-report/start`,
      /** 查询任务状态 query: jobId */
      job: `${API_PREFIX}/agent/training-report/job`,
      /** 当前组织最近任务 query: orgId?, limit? */
      jobs: `${API_PREFIX}/agent/training-report/jobs`,
      /** 下载报告 query: jobId, format?=pdf|html */
      download: `${API_PREFIX}/agent/training-report/download`,
    },
  },
} as const

/** 训练报告任务状态 */
export type TrainingReportJobStatus =
  | 'pending'
  | 'running'
  | 'done'
  | 'failed'
  | 'expired'
  | string

export interface TrainingReportJob {
  jobId: string
  status: TrainingReportJobStatus
  progress: number
  message?: string
  startDate: string
  endDate: string
  groupId?: number
  useAi?: boolean
  orgId?: number
  createdBy?: number
  createdAt?: number
  finishedAt?: number
  expiresAt?: number
  downloadable?: boolean
  errorDetail?: string
  fileName?: string
}

export interface StartTrainingReportReq {
  startDate: string
  endDate: string
  groupId?: number
  useAi?: boolean
  orgId?: number
}

export type Platform =
  | 'NowCoder'
  | 'AtCoder'
  | 'CodeForces'
  | 'LuoGu'
  | 'LeetCode'
  | 'QOJ'

/** 题单系统类型 */
export type ProblemsetKind = 'favorites' | 'todo' | 'custom' | string

/** 题单可见性 */
export type ProblemsetVisibility = 'private' | 'password' | 'public' | string

export interface ProblemsetInfo {
  id: number
  ownerId: number
  ownerName?: string
  title: string
  description?: string
  kind: ProblemsetKind
  visibility: ProblemsetVisibility
  likeCount: number
  itemCount: number
  liked?: boolean
  isOwner?: boolean
  isSystem?: boolean
  /** 仅 mine?problemId= 时返回：本题是否已在该题单 */
  containsProblem?: boolean
  createdAt?: number
  updatedAt?: number
  locked?: boolean
  items?: ProblemsetItemInfo[]
}

export interface ProblemsetItemInfo {
  id: number
  problemId: number
  sortOrder?: number
  createdAt?: number
  title?: string
  platform?: string
  externalId?: string
  url?: string
  difficulty?: string
  status?: string
  userStatus?: string
}

export interface CreateProblemsetReq {
  title: string
  description?: string
  visibility?: ProblemsetVisibility
  password?: string
}

export interface UpdateProblemsetReq {
  id: number
  title?: string
  description?: string
  visibility?: ProblemsetVisibility
  password?: string
  clearPassword?: boolean
}

export interface AddProblemsetItemReq {
  problemsetId: number
  problemId?: number
  url?: string
}

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
  /** 登录前处于休眠；已触发全量同步 */
  wasDormant?: boolean
  /** 是否已入队全量爬虫 */
  syncStarted?: boolean
  /** 距上次活跃整天数（登录前） */
  inactiveDays?: number
}

export interface RegisterReq {
  /** 3–64 位 A-Za-z0-9_-，禁止中文与其它特殊符号 */
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

/** purpose: register | reset | change_email */
export interface SendCodeReq {
  email: string
  purpose: 'register' | 'reset' | 'change_email'
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
  /** 平台当前 Rating（整数）；hasRating=false 时忽略 */
  rating?: number
  /** 是否已抓到有效 Rating */
  hasRating?: boolean
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
  /** 最近一次 OJ 数据同步成功时间（unix 秒；0/缺省=尚无记录） */
  lastSyncAt?: number
}

/** 双方共属的其他组织内称呼（仅公共域视图返回；观众须同属该组织） */
export interface SharedOrgAlias {
  orgId: number
  orgName: string
  /** 目标用户在该组织的对外称呼 */
  displayName: string
}

/** 关注/粉丝/搜索/资料展示身份 */
export interface SocialUser {
  userId: number
  username: string
  /** 主展示名：当前域称呼；不在当前域则为公共域昵称 */
  name: string
  avatar: string
  /** 是否属于观众当前组织 */
  inCurrentOrg?: boolean
  /**
   * 双方共属、且非当前域的组织徽章（含公共域）。
   * 切换到校队后也会返回「公共域 · 昵称」及其他共属校队。
   */
  sharedOrgs?: SharedOrgAlias[]
}

export interface SocialListRes {
  list: SocialUser[]
  total: number
}

export interface SocialCounts {
  followingCount: number
  followerCount: number
}

export interface SocialRelation {
  isFollowing: boolean
  isFollower: boolean
}

/** 公共域隐私设置（私人域组织内不生效） */
export interface PrivacySettings {
  privacyConfigured: boolean
  allowPublicProfile: boolean
  allowPublicFeed: boolean
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
  /** 有效：近窗提交是否触发题面爬取（默认=非公共域组织；可个人覆盖） */
  problemFetchEnabled?: boolean
  /** 有效：近窗提交是否触发题面 AI（默认=非公共域组织；可个人覆盖） */
  problemAiEnabled?: boolean
  /** 注册时间（unix 秒） */
  createdAt?: number
  /** 有效爬取间隔（分钟；站管覆盖优先，否则组织 MIN） */
  spiderIntervalMin?: number
  /** 有效 AI 总结间隔（分钟） */
  aiSummaryIntervalMin?: number
  /** 是否存在站点管理员爬取间隔覆盖 */
  spiderIntervalOverridden?: boolean
  /** 是否存在站点管理员 AI 总结间隔覆盖 */
  aiSummaryIntervalOverridden?: boolean
  /** 站管：永不休眠 */
  syncExempt?: boolean
  /** 最近活跃 unix 秒 */
  lastLoginAt?: number
  /** 当前是否休眠（后台定时已停） */
  dormant?: boolean
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
  /** 站管：强制同步（跳过成员休眠） */
  forceSync?: boolean
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

/** 组织广场卡片（无识别码/成员明细） */
export interface OrgDiscoverItem {
  id: number
  name: string
  brandLogo?: string
  memberCount: number
  isSystem?: boolean
  isMember?: boolean
  isCurrent?: boolean
}

export interface StatisticRankItem {
  rank: number
  userId: number
  name: string
  score: number
}

/** 关注用户对本题状态 */
export interface ProblemFollowingStatusItem {
  userId: number
  username: string
  name: string
  avatar: string
  /** AC | TRIED | NONE */
  status: string
}

/** 比赛日历条目（公开赛程，非参赛记录） */
export interface ContestCalendarItem {
  id: number
  platform: string
  platformName: string
  externalId: string
  name: string
  url: string
  startTime: number
  endTime: number
  source: string
  iconUrl: string
  subscribed: boolean
}

export interface ContestCalendarPlatform {
  platform: string
  platformName: string
  iconUrl: string
  count: number
}

/** scope: platform=整平台 / contest=单场 */
export interface ContestCalendarSub {
  id: number
  scope: 'platform' | 'contest' | string
  platform: string
  calendarId: number
  advanceMinutes: number
  enabled: boolean
  contestName?: string
  contestUrl?: string
  startTime?: number
}

/** 订阅提前量白名单（分钟）；新建默认 360（6 小时） */
export const CONTEST_CALENDAR_ADVANCE_OPTIONS = [
  { value: 30, label: '30 分钟' },
  { value: 60, label: '1 小时' },
  { value: 180, label: '3 小时' },
  { value: 360, label: '6 小时' },
  { value: 720, label: '12 小时' },
  { value: 1440, label: '1 天' },
  { value: 2880, label: '2 天' },
  { value: 4320, label: '3 天' },
] as const

/** 新建订阅默认提前量（6 小时） */
export const CONTEST_CALENDAR_DEFAULT_ADVANCE = 360

/** site=站点公告（全员可见）；org=组织公告 */
export type BulletinScope = 'site' | 'org' | string

export interface BulletinInfo {
  id: number
  title: string
  content: string
  authorId: number
  authorName: string
  isPinned: boolean
  createdAt: number
  updatedAt: number
  /** site=站点公告；org=组织公告 */
  scope: BulletinScope
  /** scope=org 时有值 */
  orgId: number
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

/** 题库标签/题面人工修改申请 */
export type ProblemEditStatus = 'pending' | 'approved' | 'rejected' | string

export interface ProblemEditInfo {
  id: number
  problemId: number
  platform: string
  externalId: string
  problemTitle: string
  userId: number
  userName: string
  hasTags: boolean
  hasContent: boolean
  proposedTags: string[]
  proposedContentMd: string
  proposedTitle: string
  note: string
  status: ProblemEditStatus
  reviewerId: number
  reviewNote: string
  createdAt: number
  updatedAt: number
  currentTags: string[]
  currentContentMd: string
  currentTitle: string
}

export interface AdminUpdateProblemReq {
  id: number
  updateTags?: boolean
  tags?: string[]
  updateContent?: boolean
  contentMd?: string
  title?: string
}

export interface ProposeProblemEditReq {
  problemId: number
  updateTags?: boolean
  tags?: string[]
  updateContent?: boolean
  contentMd?: string
  title?: string
  note?: string
}

export interface ReviewProblemEditReq {
  id: number
  approve: boolean
  reviewNote?: string
}

export interface ProblemListRes {
  data: ProblemInfo[]
  total: number
  page: number
  pageSize: number
}

/** 全站热题一项：题库信息 + 近窗统计 */
export interface HotProblemItem {
  problem: ProblemInfo
  /** 窗口内提交次数 */
  submitCount: number
  /** 窗口内做题人数（去重） */
  solverCount: number
  /** 窗口内 AC 次数 */
  acCount: number
  /** 综合热度分：submit*1 + solver*3 + ac*2 */
  score: number
  /** 窗口内最近提交 unix 秒 */
  lastSubmittedAt: number
}

export interface HotProblemRes {
  data: HotProblemItem[]
  total: number
  page: number
  pageSize: number
  /** 实际统计窗口天数 */
  days: number
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

/** 站内通知类型 */
export type NotificationType =
  | 'problem_edit_approved'
  | 'problem_edit_rejected'
  | 'org_join_approved'
  | 'org_join_rejected'
  | 'mention'
  | 'comment_reply'
  | 'blog_article_like'
  | 'blog_comment'
  | 'blog_comment_reply'
  | 'solution_like'
  | 'comment_like'
  | 'blog_moderation'
  | string

export interface NotificationItem {
  id: number
  type: NotificationType
  title: string
  body: string
  actorId: number
  refType: string
  refId: number
  problemId: number
  payload?: string
  isRead: boolean
  createdAt: number
}

export interface NotificationListRes {
  list: NotificationItem[]
  total: number
  page: number
  pageSize: number
  unreadCount: number
}

/** 社区互动目标类型 */
export type CommunityTargetType = 'comment' | 'solution'

/** 题目/题解评论（全站可见；支持层级；list 返回树形 replies） */
export interface ProblemCommentItem {
  id: number
  problemId: number
  /** 所属用户题解；0/缺省=题目讨论 */
  solutionId?: number
  userId: number
  username: string
  name: string
  avatar?: string
  content: string
  /** 直接父评论 id；0 为顶层 */
  parentId?: number
  /** 根评论 id */
  rootId?: number
  /** 嵌套深度，0=顶层 */
  depth?: number
  replyToUserId?: number
  replyToUsername?: string
  replyToName?: string
  likeCount?: number
  /** 当前登录用户是否已点赞 */
  liked?: boolean
  createdAt: number
  /** 子回复（list 接口树形返回） */
  replies?: ProblemCommentItem[]
}

/** 用户题解列表项（非 AI SolutionMeta） */
export interface ProblemUserSolutionItem {
  id: number
  problemId: number
  userId: number
  username: string
  name: string
  avatar?: string
  title: string
  excerpt?: string
  contentMd?: string
  likeCount?: number
  liked?: boolean
  createdAt: number
  updatedAt?: number
  /** 同步到个人博客后的文章 id */
  blogArticleId?: number
  /** 博客文章 slug（如 solution-12），配合 blogUsername 跳转 */
  blogSlug?: string
  /** 作者用户名（博客路径用） */
  blogUsername?: string
}

/** 点赞 toggle 结果 */
export interface CommunityLikeResult {
  liked: boolean
  likeCount: number
  targetType: CommunityTargetType | string
  targetId: number
}

/** 举报结果 */
export interface CommunityReportResult {
  id: number
  alreadyReported?: boolean
}

/** 发现页动态类型（公共域全站聚合；私有域按组织隔离） */
export type ActivityFeedType = 'comment' | 'solution' | string

export interface ActivityFeedItem {
  id: number
  orgId: number
  userId: number
  username: string
  name: string
  avatar?: string
  type: ActivityFeedType
  refId: number
  problemId: number
  problemTitle?: string
  platform?: string
  title: string
  excerpt: string
  createdAt: number
}

export interface UserRecentCommentItem {
  id: number
  problemId: number
  problemTitle?: string
  platform?: string
  content: string
  createdAt: number
}

/** 博客文章可见性 */
export type BlogVisibility = 'public' | 'private' | 'password'

/** 博客文章审核状态 */
export type BlogModerationStatus = 'approved' | 'pending' | 'rejected'

/** 博客互动邮件策略（默认 off） */
export type BlogEmailNotifyStrategy =
  | 'off'
  | 'immediate'
  | 'digest_daily'
  | 'random'

/** 博客开通 / 协议状态 */
export interface BlogActivationStatus {
  activated: boolean
  needAgreement: boolean
  agreementVersion: string
  signedAgreementVersion?: string
  agreementAcceptedAt?: number
  activatedAt?: number
  emailNotifyEnabled: boolean
  emailNotifyStrategy: BlogEmailNotifyStrategy | string
  themeId?: string
  subtitle?: string
  username?: string
  /** agreement 接口附带 */
  title?: string
  content?: string
}

export interface BlogAdminOverview {
  activatedUsers: number
  totalArticles: number
  totalViews: number
  totalLikes: number
  totalComments: number
  pendingReview: number
  rejected: number
}

export interface BlogAdminAuthor {
  userId: number
  username: string
  name: string
  avatar?: string
  activated: boolean
  activatedAt?: number
  agreementAcceptedAt?: number
  agreementVersion?: string
  emailNotifyEnabled?: boolean
  emailNotifyStrategy?: string
  themeId?: string
  articleCount: number
  viewCount: number
  likeCount: number
  commentCount: number
}

export interface BlogAdminArticle {
  id: number
  slug: string
  title: string
  summary?: string
  visibility: string
  viewCount: number
  likeCount: number
  commentCount: number
  moderationStatus: BlogModerationStatus | string
  moderationNote?: string
  userId: number
  username: string
  authorName?: string
  createdAt: number
  publishedAt?: number
  moderatedAt?: number
}

/** 博客作者摘要 */
export interface BlogAuthor {
  id: number
  username: string
  name: string
  avatar?: string
}

/** 博客壳主题：chirpy 默认 | simple 简约 | mizuki（https://github.com/LyraVoid/Mizuki，用户可选） */
export type BlogThemeId = 'chirpy' | 'simple' | 'mizuki'

/** 侧栏社交链接（Chirpy 左下角） */
export interface BlogSocialLink {
  /** github | twitter | x | email | rss | custom | bilibili | zhihu | ... */
  type: string
  url: string
  label?: string
}

/** 个人博客壳配置 */
export interface BlogSiteConfig {
  themeId: BlogThemeId | string
  subtitle?: string
  socialLinks: BlogSocialLink[]
}

/** 博客文章（列表可不含 content） */
export interface BlogArticle {
  id: number
  slug: string
  title: string
  summary?: string
  content?: string
  coverUrl?: string
  visibility: BlogVisibility | string
  recommend?: boolean
  syncToMainProfile?: boolean
  categoryId?: number | null
  /** 由主站题解同步时的题解 id */
  sourceSolutionId?: number
  /** 题解对应题目 id（共享评论/点赞用） */
  sourceProblemId?: number
  /** 当前摘要是否为系统默认（编辑时勿回填） */
  summaryIsDefault?: boolean
  viewCount?: number
  likeCount?: number
  commentCount?: number
  liked?: boolean
  requiresPassword?: boolean
  canSeeBody?: boolean
  unlockToken?: string
  moderationStatus?: BlogModerationStatus | string
  moderationNote?: string
  orgIds?: number[]
  userId?: number
  username?: string
  author?: BlogAuthor
  createdAt: number
  updatedAt?: number
  publishedAt?: number
}

export interface BlogCategory {
  id: number
  name: string
  sortOrder?: number
  articleCount?: number
  /** 默认分类：主站题解同步到此；不可删除 */
  isDefault?: boolean
}

export interface BlogComment {
  id: number
  articleId: number
  parentId?: number
  content: string
  userId: number
  author?: BlogAuthor
  createdAt: number
}

export interface BlogAnalytics {
  totalArticles: number
  totalViews: number
  totalLikes: number
  totalComments: number
  topArticles: Array<{
    id: number
    slug: string
    title: string
    viewCount: number
    likeCount: number
    commentCount: number
    visibility: string
  }>
}

/** 博客广场排序 */
export type BlogPlazaSort = 'latest' | 'hot' | 'recommend'

/** 博客广场 · 最近有公开文的作者 */
export interface BlogPlazaAuthor {
  id: number
  username: string
  name: string
  avatar?: string
  articleCount: number
  lastPublishedAt?: number
  latestTitle?: string
}

export interface BlogArticleWriteReq {
  id?: number
  title: string
  slug?: string
  summary?: string
  content: string
  coverUrl?: string
  visibility?: BlogVisibility | string
  password?: string
  clearPassword?: boolean
  /** @deprecated 服务端自动：公开文 recommend=true */
  recommend?: boolean
  /** @deprecated 服务端自动：公开文同步资料动态 */
  syncToMainProfile?: boolean
  categoryId?: number | null
  /** @deprecated 服务端自动同步作者所属组织 */
  orgIds?: number[]
}

export interface UserRecentSolutionItem {
  id: number
  problemId: number
  problemTitle?: string
  platform?: string
  title: string
  excerpt?: string
  createdAt: number
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
