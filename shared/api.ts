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
    plugin: {
      luogu: {
        authorizeCode: `${API_PREFIX}/user/plugin/luogu/authorize-code`,
        token: `${API_PREFIX}/user/plugin/luogu/token`,
        authorizations: `${API_PREFIX}/user/plugin/luogu/authorizations`,
        revoke: `${API_PREFIX}/user/plugin/luogu/revoke`,
      },
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
      setRefreshQuota: `${API_PREFIX}/user/profile/set-refresh-quota`,
      setSyncExempt: `${API_PREFIX}/user/profile/set-sync-exempt`,
      clearDormant: `${API_PREFIX}/user/profile/clear-dormant`,
      forceDormant: `${API_PREFIX}/user/profile/force-dormant`,
      setDisabled: `${API_PREFIX}/user/profile/set-disabled`,
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
    subscription: {
      /** 套餐列表（公开；前端对比表） */
      plans: `${API_PREFIX}/user/subscription/plans`,
      /** 创建订单（登录；返回二维码） */
      createOrder: `${API_PREFIX}/user/subscription/create-order`,
      /** 查订单状态（登录；回流轮询） */
      getOrder: `${API_PREFIX}/user/subscription/order`,
      /** 我的订阅状态（登录） */
      my: `${API_PREFIX}/user/subscription/my`,
      /** 我的 AI 能力落地状态（AI 分析配额/来源 + AI 日报权限） */
      myAiStatus: `${API_PREFIX}/user/subscription/my-ai-status`,
      /** 站管：人工赋予/更新订阅 */
      grant: `${API_PREFIX}/user/subscription/grant`,
      /** 站管：取消订阅 */
      revoke: `${API_PREFIX}/user/subscription/revoke`,
      /** 站管：订阅用户列表 */
      adminList: `${API_PREFIX}/user/subscription/admin/list`,
      /** 站管：更新套餐配额模板 */
      updatePlans: `${API_PREFIX}/user/subscription/admin/plans`,
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
    /** 细粒度 RBAC：权限目录 / 角色 CRUD / 成员指派（内置角色任命仍走 org.setRole / platform.*） */
    rbac: {
      permissions: `${API_PREFIX}/user/rbac/permissions`,
      roles: `${API_PREFIX}/user/rbac/roles`,
      roleCreate: `${API_PREFIX}/user/rbac/roles/create`,
      roleUpdate: `${API_PREFIX}/user/rbac/roles/update`,
      roleDelete: `${API_PREFIX}/user/rbac/roles/delete`,
      roleMembers: `${API_PREFIX}/user/rbac/roles/members`,
      roleAssign: `${API_PREFIX}/user/rbac/roles/assign`,
      roleUnassign: `${API_PREFIX}/user/rbac/roles/unassign`,
      /** 某用户持有的站点级自定义角色 id 列表（消 N+1） */
      userRoles: `${API_PREFIX}/user/rbac/user-roles`,
      myPermissions: `${API_PREFIX}/user/rbac/my-permissions`,
    },
    upload: `${API_PREFIX}/user/upload`,
    site: {
      config: `${API_PREFIX}/user/site/config`,
      adminConfig: `${API_PREFIX}/user/site/admin-config`,
      testEmail: `${API_PREFIX}/user/site/test-email`,
      visitPing: `${API_PREFIX}/user/site/visit-ping`,
      accessStats: `${API_PREFIX}/user/site/access-stats`,
      verifyOj: `${API_PREFIX}/user/site/verify-oj`,
      testOjProxy: `${API_PREFIX}/user/site/test-proxy`,
    },
    tickets: {
      current: `${API_PREFIX}/user/tickets/current`,
      aiAnswer: `${API_PREFIX}/user/tickets/ai/answer`,
      list: `${API_PREFIX}/user/tickets`,
      get: (id: number | string) => `${API_PREFIX}/user/tickets/${id}`,
      messages: (id: number | string) =>
        `${API_PREFIX}/user/tickets/${id}/messages`,
      create: `${API_PREFIX}/user/tickets`,
      createMessage: (id: number | string) =>
        `${API_PREFIX}/user/tickets/${id}/messages`,
      patchStatus: (id: number | string) =>
        `${API_PREFIX}/user/tickets/${id}/status`,
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
      inviteUser: `${API_PREFIX}/user/org/members/invite`,
      invites: `${API_PREFIX}/user/org/invites`,
      inviteReview: `${API_PREFIX}/user/org/invites/review`,
      inviteCancel: `${API_PREFIX}/user/org/invites/cancel`,
      setDisplayName: `${API_PREFIX}/user/org/members/set-display-name`,
      memberIds: `${API_PREFIX}/user/org/member-ids`,
      invite: `${API_PREFIX}/user/org/invite`,
      invitePreview: `${API_PREFIX}/user/org/invite/preview`,
      inviteRotate: `${API_PREFIX}/user/org/invite/rotate`,
      joinRequests: `${API_PREFIX}/user/org/join-requests`,

      // 分队
      squads: `${API_PREFIX}/user/org/squads`,
      squadCreate: `${API_PREFIX}/user/org/squads/create`,
      squadUpdate: `${API_PREFIX}/user/org/squads/update`,
      squadDelete: `${API_PREFIX}/user/org/squads/delete`,
      squadMembers: `${API_PREFIX}/user/org/squads/members`,
      squadMemberSet: `${API_PREFIX}/user/org/squads/members/set`,
      scopes: `${API_PREFIX}/user/org/scopes`,
      scopesSet: `${API_PREFIX}/user/org/scopes/set`,
      joinReview: `${API_PREFIX}/user/org/join-requests/review`,
    },
    profileIdsByOrg: `${API_PREFIX}/user/profile/ids-by-org`,
    /** agent 训练报告/周报排除教练用（内部） */
    orgCoachIds: `${API_PREFIX}/user/profile/org-coach-ids`,
    platform: {
      setSiteAdmin: `${API_PREFIX}/user/platform/set-site-admin`,
    },
    paste: {
      create: `${API_PREFIX}/user/paste/create`,
      get: `${API_PREFIX}/user/paste/get`,
      mine: `${API_PREFIX}/user/paste/mine`,
      delete: `${API_PREFIX}/user/paste/delete`,
      /** 站管/内容治理：当前全部未过期粘贴内容（事后审查） */
      adminList: `${API_PREFIX}/user/paste/admin-list`,
    },
    blog: {
      byUsername: `${API_PREFIX}/user/blog/by-username`,
      articleGet: `${API_PREFIX}/user/blog/article/get`,
      articleUnlock: `${API_PREFIX}/user/blog/article/unlock`,
      articleCreate: `${API_PREFIX}/user/blog/article/create`,
      articleUpdate: `${API_PREFIX}/user/blog/article/update`,
      articleDelete: `${API_PREFIX}/user/blog/article/delete`,
      articleMine: `${API_PREFIX}/user/blog/article/mine`,
      articlePinnedMine: `${API_PREFIX}/user/blog/article/pinned/mine`,
      articlePin: `${API_PREFIX}/user/blog/article/pin`,
      articlePinnedReorder: `${API_PREFIX}/user/blog/article/pinned/reorder`,
      recommend: `${API_PREFIX}/user/blog/recommend`,
      plaza: `${API_PREFIX}/user/blog/plaza`,
      authors: `${API_PREFIX}/user/blog/authors`,
      analytics: `${API_PREFIX}/user/blog/analytics`,
      categories: `${API_PREFIX}/user/blog/categories`,
      /** 作者标签聚合 ?username= → { name, count }[] */
      tags: `${API_PREFIX}/user/blog/tags`,
      categoryMine: `${API_PREFIX}/user/blog/category/mine`,
      categoryCreate: `${API_PREFIX}/user/blog/category/create`,
      categoryUpdate: `${API_PREFIX}/user/blog/category/update`,
      categoryDelete: `${API_PREFIX}/user/blog/category/delete`,
      commentList: `${API_PREFIX}/user/blog/comment/list`,
      commentCreate: `${API_PREFIX}/user/blog/comment/create`,
      commentDelete: `${API_PREFIX}/user/blog/comment/delete`,
      commentLike: `${API_PREFIX}/user/blog/comment/like`,
      like: `${API_PREFIX}/user/blog/like`,
      themeStatus: `${API_PREFIX}/user/blog/theme/status`,
      themeConfig: `${API_PREFIX}/user/blog/theme/config`,
      themeEnable: `${API_PREFIX}/user/blog/theme/enable`,
      agreement: `${API_PREFIX}/user/blog/agreement`,
      /** Obsidian 插件当前版本（公开）；downloadBase 指向云存储具体版本目录 */
      obsidianPluginLatest: `${API_PREFIX}/user/blog/obsidian-plugin/latest`,
      obsidianPluginPublish: `${API_PREFIX}/user/blog/obsidian-plugin/publish`,
      activationStatus: `${API_PREFIX}/user/blog/activation/status`,
      activate: `${API_PREFIX}/user/blog/activate`,
      notifyPref: `${API_PREFIX}/user/blog/notify-pref`,
      adminOverview: `${API_PREFIX}/user/blog/admin/overview`,
      adminAuthors: `${API_PREFIX}/user/blog/admin/authors`,
      adminArticles: `${API_PREFIX}/user/blog/admin/articles`,
      adminModerate: `${API_PREFIX}/user/blog/admin/moderate`,
      /** 站管：全站图片列表，mode=all|cleanup */
      adminImages: `${API_PREFIX}/user/blog/admin/images`,
      /** 站管：删除单张未引用图片 { id } */
      adminImageDelete: `${API_PREFIX}/user/blog/admin/images/delete`,
      /** 站管：按候选快照批量删除 { ids, snapshot } */
      adminImagesDeleteBatch: `${API_PREFIX}/user/blog/admin/images/delete-batch`,
      /** 站管：为作者开关图片上传 { userId, enabled } */
      adminImageUpload: `${API_PREFIX}/user/blog/admin/image-upload`,
      /** 站管：图片上传申请列表 */
      adminImageUploadRequests: `${API_PREFIX}/user/blog/admin/image-upload/requests`,
      /** 站管：审核图片上传申请 { id, action: approve|reject, note? } */
      adminImageUploadReview: `${API_PREFIX}/user/blog/admin/image-upload/review`,
      /** 当前用户图片上传能力 { configured, authorized, enabled, pendingRequest } */
      imageUploadStatus: `${API_PREFIX}/user/blog/image-upload/status`,
      /** 作者申请图片上传 { reason } */
      imageUploadApply: `${API_PREFIX}/user/blog/image-upload/apply`,
      /** 批量确认图床 URL/hash 是否仍在资产表 { urls?, hashes? } → { existing, missing, existingHashes, missingHashes } */
      imagesCheck: `${API_PREFIX}/user/blog/images/check`,
      report: `${API_PREFIX}/user/blog/report`,
      /** 举报处理台（content.report.handle）：博客举报列表 / 处理 */
      reportList: `${API_PREFIX}/user/blog/report/list`,
      reportHandle: `${API_PREFIX}/user/blog/report/handle`,
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
      /** 硬删除当前用户全部站内信 */
      clearAll: `${API_PREFIX}/user/notification/clear-all`,
    },
    admin: {
      plugins: {
        authorizations: `${API_PREFIX}/user/admin/plugins/authorizations`,
      },
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
      /** 站管：按平台全量回填 body: { platform: "LeetCode" } */
      updatePlatform: `${API_PREFIX}/core/spider/update-platform`,
      submitInventory: `${API_PREFIX}/core/spider/submit-inventory`,
      purgeSubmitsAndRecrawl: `${API_PREFIX}/core/spider/purge-submits-and-recrawl`,
      /** 站管：各 OJ 爬虫模块监控（提交/题库/比赛/账号） */
      monitor: `${API_PREFIX}/core/spider/monitor`,
      /** 站管：某 OJ 的绑定用户列表 query: platform, offset, limit */
      platformUsers: `${API_PREFIX}/core/spider/platform-users`,
      /** 用户：手动增量刷新自己的 OJ 做题记录（每日限 2 次） */
      refresh: `${API_PREFIX}/core/spider/refresh`,
      /** 用户：今日手动刷新做题记录状态（配额/剩余/冷却；只读） */
      refreshStatus: `${API_PREFIX}/core/spider/refresh-status`,
      /** 站管：暂停/恢复某 OJ 的爬虫同步 body: { platform, enabled } */
      togglePlatform: `${API_PREFIX}/core/spider/toggle-platform`,
      luoguSync: {
        start: `${API_PREFIX}/core/spider/luogu-sync/start`,
        status: `${API_PREFIX}/core/spider/luogu-sync/status`,
        page: `${API_PREFIX}/core/spider/luogu-sync/page`,
      },
      luogu: {
        resolveUser: `${API_PREFIX}/core/spider/luogu/resolve-user`,
      },
    },
    admin: {
      plugins: {
        syncAudits: `${API_PREFIX}/core/admin/plugins/sync-audits`,
      },
    },
    health: {
      /** 站管运维总览：后台进程、外部服务、中间件、资源与容量 */
      overview: `${API_PREFIX}/core/health/overview`,
      /** 近 24h CPU/内存占用时序（后台 25s 采样缓存） */
      resourceSeries: `${API_PREFIX}/core/health/resource-series`,
    },
    /** PostgreSQL 整实例灾备 */
    backup: {
      /** 异步触发全量灾备 */
      run: `${API_PREFIX}/core/backup/run`,
      /** 查询最近一次灾备状态 */
      status: `${API_PREFIX}/core/backup/status`,
      /** 下载备份加密密钥（32 原始字节，base64 返回） */
      key: `${API_PREFIX}/core/backup/key`,
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
      /** 比赛题目目录（A/B/C…）；每场 ensure 只跑一次 */
      problems: `${API_PREFIX}/core/contest/problems`,
      /** XCPCIO 风格站内榜（人×题格子） */
      board: `${API_PREFIX}/core/contest/board`,
      /** 站内榜格子：用户本场该题赛时提交明细 */
      cellSubmits: `${API_PREFIX}/core/contest/cell-submits`,
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
      refetch: `${API_PREFIX}/core/problem/refetch`,
      reanalyze: `${API_PREFIX}/core/problem/reanalyze`,
      /** 本题出现过的比赛（全平台） */
      relatedContests: `${API_PREFIX}/core/problem/related-contests`,
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
      /** 清空近期失败并停止自动重试 */
      clearRecentFailed: `${API_PREFIX}/core/problem/clear-recent-failed`,
      /** 清空牛客题面并重爬（保留标签/分析） */
      clearNowCoderContent: `${API_PREFIX}/core/problem/clear-nowcoder-content`,
      /** 全量修复 QOJ 标题误为 QOJ.ac；body: { limit?, refetch? } */
      repairQojTitles: `${API_PREFIX}/core/problem/repair-qoj-titles`,
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
      /** 举报处理台（content.report.handle）：题解/评论举报列表 / 处理 */
      reportList: `${API_PREFIX}/core/problem/report/list`,
      reportHandle: `${API_PREFIX}/core/problem/report/handle`,
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
      /** 加题：problemId 或 url；缺题面强制爬取，AI 按操作者权限 */
      add: `${API_PREFIX}/core/problemset/add`,
      /** 链接无法识别时手动建题并入题单（无需审核） */
      addManual: `${API_PREFIX}/core/problemset/add-manual`,
      remove: `${API_PREFIX}/core/problemset/remove`,
      /** 拖拽排序 body: { problemsetId, ids }（ids=题单项 id，按序重写 sortOrder） */
      reorder: `${API_PREFIX}/core/problemset/reorder`,
      like: `${API_PREFIX}/core/problemset/like`,
      /** 收藏题单 toggle */
      favorite: `${API_PREFIX}/core/problemset/favorite`,
      /** 我收藏的题单（排除自己的） */
      favorites: `${API_PREFIX}/core/problemset/favorites`,
    },
  },
  agent: {
    trainingReport: {
      /** 发起组织训练报告（异步） */
      start: `${API_PREFIX}/agent/training-report/start`,
      /** 查询任务状态 query: jobId */
      job: `${API_PREFIX}/agent/training-report/job`,
      /** 当前组织最近任务 query: orgId?, limit? */
      jobs: `${API_PREFIX}/agent/training-report/jobs`,
      /** 下载报告 query: jobId（HTML） */
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

export interface AdminListPluginAuthorizationsReq {
  pageNum: number
  pageSize: number
  keyword?: string
  status?: string
  platform?: string
}

export interface AdminPluginAuthorizationInfo {
  id: number | string
  userId: number | string
  username: string
  name: string
  provider: string
  platform: string
  ojUid: string
  clientKind: string
  clientVersion: string
  acceptedAt: number | string
  expiresAt: number | string
  lastUsedAt: number | string
  revokedAt: number | string
  status: string
}

export interface AdminListPluginAuthorizationsRes {
  list: AdminPluginAuthorizationInfo[]
  total: number | string
  pageNum: number
  pageSize: number
}

export type ClientSyncAuditStatus = 'running' | 'completed' | 'failed' | 'terminated' | 'expired'

export interface AdminListClientSyncAuditsReq {
  pageNum: number
  pageSize: number
  keyword?: string
  platform?: string
  status?: ClientSyncAuditStatus
  from?: number | string
  to?: number | string
}

export interface ClientSyncAuditInfo {
  sessionId: string
  authorizationId: number | string
  userId: number | string
  platform: string
  ojUid: string
  clientKind: string
  clientVersion: string
  status: ClientSyncAuditStatus
  completionReason: string
  startedAt: number | string
  updatedAt: number | string
  terminalAt: number | string
  processedPages: number
  remoteCount: number
  inserted: number | string
  restartCount: number
  errorCode: string
  errorMessage: string
  username: string
}

export interface AdminListClientSyncAuditsRes {
  list: ClientSyncAuditInfo[]
  total: number | string
  pageNum: number
  pageSize: number
}

export interface HealthBackendServiceItem {
	/** 后台服务名：user / core-data / agent */
  name: string
  /** ok | unchecked */
  status: string
  errMsg: string
}

export interface HealthExternalServiceItem {
  /** agent / ai_analyze / smtp / oj_luogu / oj_qoj */
  name: string
  /** ok | fail | unchecked */
  status: string
  at: number
  errMsg: string
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
  | 'LOJ'
  | 'UOJ'
  | 'POJ'

/** 单个 OJ 的爬虫各模块监控（GET /core/spider/monitor 返回项） */
export interface SpiderPlatformStat {
  platform: Platform | string
  /** 绑定该 OJ 的用户数 */
  boundUsers: number
  /** 该 OJ 已入库提交记录数 */
  submitCount: number
  /** 今日入队任务数 */
  todayEnqueued: number
  /** 今日新入库（写入数据库）提交记录条数 */
  todayRows: number
  /** 今日成功任务数 */
  todayOk: number
  /** 今日失败任务数 */
  todayFail: number
  /** 最近一次成功同步（unix 秒；0=无） */
  lastOkAt: number
  /** 最近一次同步失败（unix 秒；0=无） */
  lastFailAt: number
  /** 最近一次失败短文案 */
  lastError: string
  /** 题库模块：已入库题目数 */
  problemCount: number
  /** 比赛模块：日历已入库场次数 */
  contestCount: number
  /** 是否有提交爬虫能力 */
  hasSubmitFetcher: boolean
  /** 是否有题库爬虫能力 */
  hasProblemFetch: boolean
  /** 是否有比赛日历能力 */
  hasContestCalendar: boolean
  /** 是否有全局账号（洛谷/QOJ） */
  hasAccount: boolean
  /** 账号状态（ok/fail/unchecked；无全局账号时忽略） */
  accountStatus: string
  /** 账号最近状态时间（unix 秒） */
  accountAt: number
  /** 账号失败原因 */
  accountErr: string
  /** 站管是否已暂停该 OJ 的提交记录同步 */
  submitPaused: boolean
  /** 站管是否已暂停该 OJ 的题面获取 */
  problemPaused: boolean
  officialStatementEnabled: boolean
  proxyEnabled: boolean
  vjudgeStatementEnabled: boolean
  /** @deprecated 兼容字段，值与 submitPaused 相同 */
  paused: boolean
}

/** 各 OJ 爬虫监控响应（GET /core/spider/monitor） */
export interface SpiderMonitorRes {
  code: number
  message: string
  platforms: SpiderPlatformStat[]
  collectedAt: number
}

/** 某 OJ 的绑定用户（GET /core/spider/platform-users 返回项） */
export interface PlatformUserItem {
  userId: number
  /** 站内展示名（无则回退站内用户名） */
  name: string
  /** 站内用户名 */
  username: string
  /** 绑定的该 OJ 账号 */
  ojUsername: string
  /** 平台当前 rating（hasRating=false 时忽略） */
  rating?: number
  hasRating?: boolean
}

/** 洛谷公开 UID/用户名解析结果（无需 GoAlgo 登录） */
export interface LuoguResolvedUser {
  uid: string
  username: string
}

/** 某 OJ 绑定用户列表响应（GET /core/spider/platform-users） */
export interface PlatformUsersRes {
  code: number
  message: string
  total: number
  list: PlatformUserItem[]
}

/** 手动刷新做题记录响应（POST /core/spider/refresh） */
export interface RefreshSpiderRes {
  code: number
  message: string
  /** 今日剩余手动刷新次数（0=已用完） */
  remaining: number
}

/** 今日手动刷新做题记录状态（GET /core/spider/refresh-status） */
export interface RefreshSpiderStatusRes {
  code: number
  message: string
  /** 今日有效总配额（已合并订阅/站管覆盖；0=禁止） */
  limit: number
  /** 今日剩余次数（0=已用完） */
  remaining: number
  /** 下次可刷新 unix 秒（0=立即可刷新） */
  nextAvailableAt: number
  /** 当前生效自动同步间隔（分钟；min(站管覆盖, 组织 MIN, 订阅档)；失败回落默认） */
  syncIntervalMin: number
}

export type DisasterBackupState = 'idle' | 'running' | 'succeeded' | 'failed' | 'disabled'

export type DisasterBackupTrigger = 'manual' | 'scheduled' | ''

/** PostgreSQL 整实例灾备状态（GET /core/backup/status） */
export interface DisasterBackupStatus {
  enabled: boolean
  status: DisasterBackupState
  trigger: DisasterBackupTrigger
  stage: string
  message: string
  error: string
  startedAt: number
  finishedAt: number
  archiveKey: string
  archiveSize: number
  sha256: string
  databaseCount: number
}

export interface RunDisasterBackupRes {
  accepted: boolean
  status: DisasterBackupStatus
}

export interface GetDisasterBackupStatusRes {
  status: DisasterBackupStatus
}

/** 备份加密密钥下载响应（GET /core/backup/key）；base64 编码的 32 原始字节 */
export interface DownloadBackupKeyRes {
  key: string
}

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
  /** 当前用户是否已收藏该题单（与点赞分离） */
  favorited?: boolean
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
  /** 题库标签；无则空数组 / 省略 */
  tags?: string[]
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
  /** 省略或 0：仅向题库入库（须提供 url）；有值则同时加入该题单 */
  problemsetId?: number
  problemId?: number
  url?: string
}

/** 手动向题库加题；可选加入题单（无需审核） */
export interface AddManualProblemsetItemReq {
  /** 省略或 0：仅向题库入库 */
  problemsetId?: number
  title: string
  contentMd?: string
  tags?: string[]
  sourceUrl?: string
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
  /** 可选：组织邀请识别码；注册成功后自动加入该组织 */
  inviteCode?: string
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

export const LUOGU_PLUGIN_RISK_VERSION = '2026-08-28-v1' as const

export type LuoguPluginClientKind = 'userscript'

export interface LuoguPluginAuthorizeCodeReq {
  luoguUid: string
  clientKind: LuoguPluginClientKind
  clientVersion: string
  codeChallenge: string
  codeChallengeMethod: 'S256'
  state: string
  riskAccepted: boolean
  riskVersion: typeof LUOGU_PLUGIN_RISK_VERSION
  scope: 'luogu.sync'
}

export interface LuoguPluginAuthorizeCodeRes {
  code: string
  state: string
  expiresAt: number | string
  scope: 'luogu.sync'
}

export interface LuoguPluginTokenReq {
  code: string
  verifier: string
  state: string
  scope: 'luogu.sync'
}

export interface LuoguPluginTokenRes {
  authorizationId: number | string
  deviceToken: string
  scope: 'luogu.sync'
  expiresAt: number | string
}

export interface LuoguPluginAuthorization {
  id: number | string
  provider: 'luogu'
  clientKind: LuoguPluginClientKind
  clientVersion: string
  luoguUid: string
  riskVersion: string
  acceptedAt: number | string
  expiresAt: number | string
  lastUsedAt: number | string
  revokedAt: number | string
  createdAt: number | string
  scope: 'luogu.sync'
}

export interface LuoguPluginAuthorizationsRes {
  authorizations: LuoguPluginAuthorization[]
}

export interface LuoguPluginRevokeReq {
  authorizationId?: number | string
  all?: boolean
}

export interface LuoguPluginRevokeRes {
  revokedCount: number
}

export interface LuoguSyncStartReq {
  clientKind: LuoguPluginClientKind
  clientVersion: string
  requestId: string
}

export interface LuoguSyncStartRes {
  sessionId: string
  sessionToken: string
  resumed: boolean
  nextPage: number
  pageDelayMs: number
  expiresAt: number | string
  nextAvailableAt: number | string
}

export type LuoguSyncCompletionReason = '' | 'checkpoint' | 'remote_end'

export interface LuoguSyncStatusRes {
  sessionId: string
  nextPage: number
  inserted: number | string
  processedPages: number
  totalPages: number
  expiresAt: number | string
  nextAvailableAt: number | string
  connected: boolean
  done: boolean
  completionReason: LuoguSyncCompletionReason
}

export interface LuoguSyncProblem {
  pid: string
  title: string
  difficulty: number
}

export interface LuoguSyncRecord {
  submitId: string
  submitTime: number | string
  status: number
  language: number
  problem: LuoguSyncProblem
}

export interface LuoguSyncPageReq {
  luoguUid: string
  page: number
  remoteCount: number
  perPage: number
  records: LuoguSyncRecord[]
}

export interface LuoguSyncPageRes {
  connected: boolean
  done: boolean
  completionReason: LuoguSyncCompletionReason
  nextPage: number
  restart: boolean
  pageInserted: number | string
  inserted: number | string
  processedPages: number
  totalPages: number
  nextAvailableAt: number | string
}

export type LuoguSyncErrorCode =
  | 'LUOGU_LOGIN_REQUIRED'
  | 'GOALGO_CONNECT_REQUIRED'
  | 'TOKEN_EXPIRED'
  | 'RISK_REACCEPT_REQUIRED'
  | 'LUOGU_UID_MISMATCH'
  | 'LUOGU_UID_ALREADY_BOUND'
  | 'SUBMIT_OWNER_CONFLICT'
  | 'SYNC_COOLDOWN'
  | 'SYNC_IN_PROGRESS'
  | 'SESSION_EXPIRED'
  | 'LUOGU_LAYOUT_CHANGED'
  | 'LUOGU_RECORDS_CHANGED'
  | 'LUOGU_BINDING_INVALID_REMOVED'
  | 'SYNC_UNAVAILABLE'

export interface LuoguSyncErrorMetadata {
  code?: LuoguSyncErrorCode
  nextAvailableAt?: number | string
  retryAfterSeconds?: number | string
}

export interface LuoguSyncErrorRes {
  code: number | LuoguSyncErrorCode
  reason?: LuoguSyncErrorCode
  message: string
  metadata?: LuoguSyncErrorMetadata
  nextAvailableAt?: number | string
  retryAfterSeconds?: number | string
}

export interface SpiderBinding {
  platform: string
  username: string
  /** 平台当前 Rating（整数）；hasRating=false 时忽略 */
  rating?: number
  /** 是否已抓到有效 Rating */
  hasRating?: boolean
  /** 该平台最近一次同步成功时间（unix 秒；0/缺省=尚无） */
  lastSyncAt?: number
  /** 该平台最近一次同步失败时间（unix 秒；0/缺省=无或已恢复） */
  lastFailAt?: number
  /** 最近一次失败的短文案（成功后清空） */
  lastError?: string
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
  problemFetchEnabled?: boolean
  problemAiEnabled?: boolean
  roleId?: number
  spiders: SpiderBinding[]
  /** 最近一次 OJ 数据同步成功时间（unix 秒；0/缺省=尚无记录） */
  lastSyncAt?: number
  /** 个人 AI 日报开关（仅 Pro 订阅生效；默认关；隐私字段） */
  aiDailyEnabled?: boolean
}

/** POST /user/profile/update；avatar 省略/空值不改，clearAvatar=true 才显式清空。 */
export interface UpdateProfileReq {
  userId: number
  email: string
  avatar?: string
  clearAvatar?: boolean
  emailCode?: string
  aiDailyEnabled?: boolean
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
  /** 全站特殊身份（公共域 badge） */
  isSiteAdmin?: boolean
  /** 持有的自定义站点角色名（公共域 badge；内置角色不在其中） */
  siteRoles?: string[]
  /** C 端订阅档 plus|pro（过期返回空） */
  subTier?: string
  /** 目标在当前观众组织内的角色（member/captain/group_leader/coach/org_admin；非当前域成员为空） */
  orgRole?: string
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
  role: OrgRoleValue | string
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
  /** 持有的自定义站点角色名（管理端 badge；内置角色不在其中） */
  siteRoles?: string[]
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
  /** 是否存在站点管理员爬取间隔覆盖 */
  spiderIntervalOverridden?: boolean
  /** 每日手动刷新做题记录有效配额（0=禁止；默认 2） */
  dailyRefreshQuota?: number
  /** 是否存在站点管理员每日刷新配额覆盖 */
  dailyRefreshQuotaOverridden?: boolean
  /** 站管：永不休眠 */
  syncExempt?: boolean
  /** 最近活跃 unix 秒 */
  lastLoginAt?: number
  /** 当前是否休眠（后台定时已停） */
  dormant?: boolean
  /** 站管强制冻结同步（覆盖组织/个人豁免） */
  adminForceDormant?: boolean
  /** 账号是否被禁用（禁止登录） */
  disabled?: boolean
  /** C 端订阅档 plus|pro（过期返回空） */
  subTier?: string
  /** C 端订阅到期 unix 秒（0=未订阅/长期） */
  subExpireAt?: number
}

export interface UserListRes {
  list: UserListItem[]
  total: number
}

/** C 端订阅套餐档（plan = free|plus|pro） */
export interface SubscriptionPlan {
  plan: string
  /** 价格（分）；free=0 */
  priceCents: number
  /** 每日手动刷新次数 */
  manualRefreshDaily: number
  /** 自动同步间隔（分钟） */
  syncIntervalMin: number
  /** AI 分析题目次数/月（0=无） */
  aiAnalyzeMonth: number
  /** 爬题面 */
  enableFetchProblem: boolean
  /** AI 分析题目 */
  enableAiAnalyze: boolean
  /** AI 日报（Pro 专属，默认关） */
  enableAiDaily: boolean
  /** 常规日报（无 AI） */
  enableRegularDaily: boolean
  /** 购买时长（天） */
  days: number
  /** 上架 */
  enabled: boolean
}

/** 我的订阅状态（tier 空=未订阅） */
export interface MySubscription {
  tier: string
  /** 到期 unix 秒（0=长期） */
  expireAt: number
  /** payfm|manager */
  source: string
  /** 剩余天数（已过期按 0） */
  daysLeft: number
  /** 排队档 plus|pro（当前档到期后自动生效；空=无排队） */
  pendingTier?: string
  /** 排队档剩余/购买天数 */
  pendingDaysLeft?: number
}

/** 我的 AI 能力落地状态（GET /user/subscription/my-ai-status） */
export interface MyAiStatusRes {
  code: number
  message: string
  /** AI 分析落地月配额（>0=可分析；unlimited 时不适用） */
  aiAnalyzeQuota: number
  /** AI 分析权限来源：pro | org | pro_org | none */
  aiAnalyzeSource: string
  /** AI 日报：组织是否已授权日报 */
  aiDailyOrgAllowed: boolean
  /** AI 日报当前是否生效（Pro 订阅 + 套餐开启 + 个人开关） */
  aiDailyEnabled: boolean
  /** 组织开通 AI 分析：无限配额（组织成员优先消耗组织，不受 aiAnalyzeQuota 限制） */
  aiAnalyzeUnlimited: boolean
}

/** 支付订单（创建返回） */
export interface SubscriptionOrder {
  orderNo: string
  /** 支付FM支付链接（前端跳转支付页） */
  payUrl: string
  /** 应付金额（分） */
  amountCents: number
  /** 订单失效 unix 秒 */
  expireAt: number
  /** 购买月数（1–12） */
  months?: number
  /** 履约天数（套餐 days × months） */
  days?: number
}

/** 订阅用户列表项（站管） */
export interface SubUser {
  userId: number
  username: string
  name: string
  /** plus|pro；空=未订阅 */
  tier: string
  /** 到期 unix 秒（0=长期） */
  expireAt: number
  /** payfm|manager */
  source: string
  /** 头像（已扩展为完整 URL；空=未设置） */
  avatar?: string
  /** 排队档 plus|pro（空=无排队） */
  pendingTier?: string
  /** 排队档剩余/购买天数 */
  pendingDays?: number
}

export interface GroupInfo {
  id: number
  name: string
  describe: string
  users?: UserListItem[]
  /** 分组成员总数（get 分页时返回） */
  total?: number
  page?: number
  pageSize?: number
}

/** 组织内系统角色取值（自定义角色见 RbacRole） */
export type OrgRoleValue =
  | 'member'
  | 'captain'
  | 'group_leader'
  | 'coach'
  | 'org_admin'

/** 权限作用域：site=站点级 org=组织级 */
export type PermScope = 'site' | 'org'

/** 权限点（目录由后端 /user/rbac/permissions 下发，代码即权威） */
export interface PermInfo {
  code: string
  label: string
  desc: string
  scope: PermScope
}

/** 权限分组（供勾选矩阵渲染） */
export interface PermGroup {
  key: string
  label: string
  scope: PermScope
  perms: PermInfo[]
}

/** RBAC 角色（内置 isSystem 权限集锁定；自定义可编辑/删除/指派） */
export interface RbacRole {
  roleId: number
  code: string
  name: string
  description: string
  scope: PermScope
  /** 组织自定义角色的组织 ID；站点级/全局模板为 0 */
  orgId: number
  isSystem: boolean
  /** 内置角色是否允许当前组织改权限（教练/队长为 true；团队管理员/成员固定 false） */
  permsEditable?: boolean
  /** 内置角色的权限已被本组织改过（可恢复默认） */
  customized?: boolean
  permissions: string[]
  memberCount: number
}

export interface RbacRoleMember {
  userId: number
  username: string
  name: string
  avatar?: string
}

/** GET /user/rbac/my-permissions（查库实时值） */
export interface MyPermissionsRes {
  perms: string[]
  roles: { name: string; scope: PermScope; code: string }[]
  isSiteAdmin: boolean
  orgId: number
  orgRole?: OrgRoleValue | string
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
  enableAiEmail?: boolean
  enableAiWeeklyEmail?: boolean
  enableSpider?: boolean
  spiderIntervalMin?: number
  aiEmailSchedule?: string
  /** 站管：强制同步（跳过成员休眠） */
  forceSync?: boolean
  /** 题面爬取开关（组织级能力） */
  enableFetchProblem?: boolean
  /** AI 分析开关（组织级能力） */
  enableAiAnalyze?: boolean
  myRole?: OrgRoleValue | string
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
  /** C 端订阅档 plus|pro */
  subTier?: string
  role: OrgRoleValue | string
  groupId?: number | null
  joinedAt?: number
  /** 组长/队长的管理范围（任命时绑定） */
  scopes?: ScopeGrant[]
}

export interface OrgInviteInfo {
  id: number
  orgId: number
  orgName: string
  userId: number
  username?: string
  name?: string
  inviterId?: number
  inviterName?: string
  role?: string
  orgDisplayName?: string
  /** pending | accepted | rejected | cancelled */
  status?: string
  createdAt?: number
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
  /** 参赛者展示名（全部比赛列表用） */
  userName?: string
  contestId: string
  contestName: string
  contestUrl: string
  rank: number
  totalCount: number
  acCount: number
  /** 兼容字段：优先为开赛时间 */
  time: string
  /** 开赛 unix 秒（0/缺省=未知） */
  startTime?: number
  /** 结束 unix 秒（0/缺省=未知） */
  endTime?: number
}

export interface ContestRankingItem {
  rank: number
  userId: number
  name: string
  avatar: string
  /** C 端订阅档 plus|pro */
  subTier?: string
  score: number
  acCount: number
  totalCount: number
}

/** 站内赛榜单题格子（XCPCIO 风格） */
export interface ContestBoardCell {
  label: string
  externalId?: string
  /** AC=赛时通过 | UPSOLVE=补题通过 | UPSOLVE_TRIED=补题未过 | TRIED=赛时未过 | NONE */
  status: string
  /** AC 前错误次数；未 AC 为尝试次数 */
  attempts: number
  /** 仅赛时 AC 有相对开赛秒；补题格一般为空 */
  relativeSec?: number
  firstAcAt?: number
  scoreDelta?: number
}

export interface ContestBoardProblemCol {
  label: string
  externalId: string
  title: string
}

export interface ContestBoardRow {
  userId: number
  name: string
  avatar: string
  /** C 端订阅档 plus|pro */
  subTier?: string
  rankOfficial: number
  rankLocal: number
  solved: number
  penaltySec: number
  score: number
  acCount: number
  /** 是否有逐题 AC/尝试明细 */
  hasDetail?: boolean
  /** true=有赛时参赛记录；false=仅赛后补题 */
  isContestant?: boolean
  cells: ContestBoardCell[]
}

export interface ContestBoardData {
  contest: Partial<ContestItem> | null
  /** icpc | leetcode */
  scoring: string
  /** 本场是否有任意逐题明细；false 时只展示 AC 题数 */
  hasCellDetail?: boolean
  problems: ContestBoardProblemCol[]
  rows: ContestBoardRow[]
  total: number
}

/** 站内榜格子弹窗：单条提交（赛时或赛后） */
export interface ContestCellSubmitItem {
  id: number
  submitId: string
  status: string
  lang: string
  /** unix 秒 */
  time: number
  /** 仅赛时：相对开赛秒 */
  relativeSec?: number
  /** contest=赛时 | upsolve=赛后补题 */
  phase?: 'contest' | 'upsolve' | string
  problem: string
  contest: string
  externalId?: string
  platform?: string
  problemId?: number
}

export interface ContestCellSubmitsData {
  contest: Partial<ContestItem> | null
  platform: string
  contestId: string
  userId: number
  userName: string
  label: string
  externalId: string
  startTime?: number
  endTime?: number
  list: ContestCellSubmitItem[]
  total: number
}

/** 比赛内题目（Tab A/B/C…） */
export interface ContestProblemItem {
  label: string
  externalId: string
  title: string
  url: string
  problemId: number
  sortOrder: number
  status?: string
  hasContent?: boolean
  difficulty?: string
  tags?: string[]
}

export interface ContestProblemsData {
  contest: Partial<ContestItem> | null
  ensureStatus: string
  ensureError?: string
  list: ContestProblemItem[]
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
  /** C 端订阅档 plus|pro */
  subTier?: string
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

/** 订阅提前量白名单（分钟）；新建默认 180（3 小时） */
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

/** 新建订阅默认提前量（3 小时） */
export const CONTEST_CALENDAR_DEFAULT_ADVANCE = 180

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

/** 题面/标签审核通过后的贡献者 */
export interface ProblemContributor {
  userId: number
  name: string
  username: string
  avatar?: string
}

export interface ProblemInfo {
  id: number
  platform: string
  externalId: string
  title: string
  url: string
  contentMd: string
  contentSource?: string
  contentSourceUrl?: string
  contentLanguage?: string
  contentFetchedAt?: number
  analyzedAt?: number
  analyzedModel?: string
  canRefetch?: boolean
  canReanalyze?: boolean
  problemType: string
  tags: string[]
  solutions: SolutionMeta[]
  difficulty: string
  status: string
  errorMsg: string
  lastSubmittedAt: number
  userStatus: string
  /** 审核通过的贡献者（详情 Get 返回；多人全列） */
  contributors?: ProblemContributor[]
}

/** 题目关联的一场比赛（站内详情用 contestLogId → /contest/{id}） */
export interface ProblemRelatedContest {
  platform: string
  contestId: string
  label: string
  contestName: string
  contestLogId: number
  contestTime: number
  problemTitle: string
  contestUrl: string
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
  hasDifficulty?: boolean
  proposedTags: string[]
  proposedContentMd: string
  proposedTitle: string
  proposedDifficulty?: string
  note: string
  status: ProblemEditStatus
  reviewerId: number
  reviewNote: string
  createdAt: number
  updatedAt: number
  currentTags: string[]
  currentContentMd: string
  currentTitle: string
  currentDifficulty?: string
}

export interface AdminUpdateProblemReq {
  id: number
  updateTags?: boolean
  tags?: string[]
  updateContent?: boolean
  contentMd?: string
  title?: string
  updateDifficulty?: boolean
  /** 简单 | 中等 | 困难；updateDifficulty 时写入，空串清空 */
  difficulty?: string
}

export interface ProposeProblemEditReq {
  problemId: number
  updateTags?: boolean
  tags?: string[]
  updateContent?: boolean
  contentMd?: string
  title?: string
  note?: string
  updateDifficulty?: boolean
  difficulty?: string
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
  /** 能力雷达 Top 8：score=掌握度/能力分 0–100（题目难度后验、个人首次 AC 过程与标签广度置信度），acCount=该标签下去重 AC 题数 */
  radar: { tag: string; score: number; acCount: number }[]
  /** 全部个人标签统计；词云和标签 AC 排行使用 */
  tagStats: { tag: string; score: number; acCount: number }[]
  /** 平台过题；牛客统一为 NowCoder（不再拆竞赛站 / Tracker） */
  platforms: { name: string; count: number }[]
  difficulties: { name: string; count: number }[]
  totalAc: number
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

/** 粘贴板审查条目（站管/内容治理查看当前有效粘贴内容） */
export interface PasteAdminItem extends PasteInfo {
  /** 创建者用户名（账号已删除时为空） */
  username?: string
  /** 创建者昵称 */
  name?: string
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
  | 'blog_comment_like'
  | 'solution_like'
  | 'comment_like'
  | 'blog_moderation'
  | 'blog_report'
  | 'community_report'
  | 'user_registered'
  | 'user_frozen'
  | 'user_unfrozen'
  | 'review_pending'
  | 'resource_reviewer_appointed'
  | 'resource_reviewer_revoked'
  | 'image_upload_approved'
  | 'image_upload_rejected'
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
  /** C 端订阅档 plus|pro */
  subTier?: string
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
  /** C 端订阅档 plus|pro */
  subTier?: string
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

/** 举报处理状态（博客 / 题解 / 评论通用） */
export type ReportStatus = 'pending' | 'resolved' | 'dismissed'

/** 举报处理动作 */
export type ReportHandleAction = 'resolve' | 'dismiss'

export interface ReportReporter {
  userId: number
  username: string
}

/** 举报处理台：题解/评论举报条目（GET /core/problem/report/list） */
export interface CommunityReportAdminItem {
  id: number
  /** RFC3339 */
  createdAt: string
  status: ReportStatus | string
  reason: string
  targetType: CommunityTargetType | string
  targetId: number
  reporter: ReportReporter
  /** 被举报内容预览；目标已删除时 exists=false 且其余字段缺省 */
  target: {
    exists: boolean
    problemId?: number
    /** 评论所属题解；0=题目讨论 */
    solutionId?: number
    /** 题解标题 */
    title?: string
    /** 评论摘录（≤120 字） */
    excerpt?: string
    authorUserId?: number
    authorUsername?: string
  }
}

/** 举报处理台：博客举报条目（GET /user/blog/report/list） */
export interface BlogReportAdminItem {
  id: number
  /** Unix 秒 */
  createdAt: number
  status: ReportStatus | string
  reason: string
  articleId: number
  reporter: ReportReporter
  /** 被举报文章预览；文章已删除时 exists=false 且其余字段缺省 */
  target: {
    exists: boolean
    slug?: string
    title?: string
    authorUserId?: number
    authorUsername?: string
  }
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
/** Obsidian 插件当前版本（GET /user/blog/obsidian-plugin/latest） */
export interface ObsidianPluginUpdateInfo {
  id?: string
  name?: string
  version: string
  minAppVersion?: string
  notes?: string
  releasedAt?: number
  /** 云存储该版本目录，无尾 / */
  downloadBase: string
}

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
  /** 是否已授权博客/题解图片上传（又拍云） */
  imageUploadEnabled?: boolean
  articleCount: number
  viewCount: number
  likeCount: number
  commentCount: number
}

/** 当前用户博客图片上传能力 */
export interface BlogImageUploadStatus {
  /** 站点又拍云已配置 */
  configured: boolean
  /** 站管已授权该用户 */
  authorized: boolean
  /** configured && authorized */
  enabled: boolean
  /** 是否有待审的图片上传申请 */
  pendingRequest?: boolean
  pendingRequestId?: number
}

export type BlogAdminImageMode = 'all' | 'cleanup'

/** 站点管理员看到的全站图片资产 */
export interface BlogAdminImageAsset {
  id: number
  userId: number
  username: string
  name?: string
  objectKey: string
  url: string
  contentHash?: string
  purpose: string
  createdAt: string | number
  referenced: boolean
}

export interface BlogAdminImageListResult {
  list: BlogAdminImageAsset[]
  total: number
  page: number
  pageSize: number
  mode: BlogAdminImageMode
  candidateIds: number[]
  snapshot: string
}

export interface BlogAdminImageDeleteResult {
  deleted: number
}

/** 图片上传权限申请（博客管理审核） */
export type BlogImageUploadRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'

export interface BlogImageUploadRequestItem {
  id: number
  userId: number
  username: string
  name?: string
  avatar?: string
  reason: string
  status: BlogImageUploadRequestStatus | string
  createdAt: number
  reviewNote?: string
  reviewerId?: number
  reviewedAt?: number
}

export interface BlogAdminArticle {
  id: number
  slug: string
  title: string
  summary?: string
  visibility: string
  /** 广场「精选」：仅站管/资源审核员可设 */
  recommend?: boolean
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
  /** C 端订阅档 plus|pro */
  subTier?: string
}

/** 博客壳主题：mizuki 默认 | chirpy | simple 简约（https://github.com/LyraVoid/Mizuki） */
export type BlogThemeId = 'chirpy' | 'simple' | 'mizuki'

/** 侧栏社交链接（Chirpy 左下角） */
export interface BlogSocialLink {
  /** github | twitter | x | email | rss | custom | bilibili | zhihu | ... */
  type: string
  url: string
  label?: string
}

/** 博客默认明暗（读者可本地覆盖） */
export type BlogColorScheme = 'light' | 'dark' | 'system'

/** 个人博客壳配置 */
export interface BlogSiteConfig {
  themeId: BlogThemeId | string
  /** 博主默认明暗；缺省 system（跟随系统） */
  colorScheme?: BlogColorScheme | string
  subtitle?: string
  socialLinks: BlogSocialLink[]
  /** 关于页 Markdown；空则用默认紧凑 UI */
  aboutMd?: string
  /** 首页介绍 Markdown；空则不展示介绍块 */
  homeIntroMd?: string
  /** 友链页 Markdown；空则不展示友链入口 */
  friendsMd?: string
}

/** 博客文章标签聚合项 */
export interface BlogTagCount {
  name: string
  count: number
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
  /**
   * 是否同步到主站曝光面（资料动态 / 广场 / 组织发现）。
   * 公开文默认 true；显式 false = 仅个人站可见，不进广场。
   */
  syncToMainProfile?: boolean
  /** 自由标签 */
  tags?: string[]
  categoryId?: number | null
  /** 由主站题解同步时的题解 id */
  sourceSolutionId?: number
  /** 题解对应题目 id（共享评论/点赞用） */
  sourceProblemId?: number
  /** 摘要是否为系统生成（现已一律自动生成，恒为 true） */
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
  /** 置顶操作时间；仅影响个人博客无筛选首页 */
  pinnedAt?: number
  /** 置顶区顺序，从 1 开始，数值越小越靠前 */
  pinOrder?: number
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
  /** 点赞数 */
  likeCount?: number
  /** 当前用户是否已赞（登录时） */
  liked?: boolean
  /** 回复目标（嵌套时） */
  replyToUserId?: number
  replyToUsername?: string
  replyToName?: string
  /** 子回复（list 仅分页顶层，回复嵌套在此） */
  replies?: BlogComment[]
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
  /** C 端订阅档 plus|pro */
  subTier?: string
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
  /**
   * 当 coverUrl 为空且为 true 时，服务端将正文第一张 http(s) 图写入 coverUrl。
   * 不入库；缺省 false（旧客户端行为不变）。
   */
  useFirstImageAsCover?: boolean
  visibility?: BlogVisibility | string
  password?: string
  clearPassword?: boolean
  /** 广场精选：站管/资源审核员标记，非作者可写 */
  recommend?: boolean
  /**
   * 是否同步到主站（资料动态 / 广场 / 组织发现）。
   * 公开文默认 true；false = 仅个人博客壳可见。
   * private / password 文此字段无意义（本就不曝光）。
   */
  syncToMainProfile?: boolean
  /** 自由标签 */
  tags?: string[]
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

/** 运维配置保存分区：单卡保存用对应分区，缺省按 `all`（整页保存） */
export type SiteConfigSection =
  | 'basic'
  | 'email'
  | 'ai'
  | 'upyun'
  | 'oj'
  | 'payment'
  | 'backup'
  | 'ops'
  | 'all'

/** 自动整实例灾备设置；执行时间按 Asia/Shanghai，prefix 为空时对象固定为 `algobak`。 */
export interface SiteBackupSettings {
  backupEnabled: boolean
  backupTime: string
  backupPrefix: string
}

/** 分队 */
export interface SquadInfo {
  id: number
  orgId: number
  groupId: number
  name: string
  describe?: string
  memberCount?: number
}

export interface ScopeGrant {
  scopeType: 'group' | 'squad'
  scopeId: number
  /** 分组名或分队名 */
  scopeName?: string
  /** 分队所属分组名 */
  groupName?: string
  /** 展示文案，如「队长 · 算法协会 / A队」 */
  label?: string
}

// —— 工单（对接外部客户中心；时间字段 unix 秒）——
export type TicketStatus =
  | 'pending_agent'
  | 'pending_customer'
  | 'resolved'
  | 'closed'
  | string

export type TicketSenderType = 'customer' | 'support_agent' | string
export type TicketContentType = 'text' | string

export interface Ticket {
  id: string
  ticketNumber: number
  title: string
  status: TicketStatus
  priority?: string
  awaitingActor?: string
  latestMessageAt?: number
  createdAt?: number
  updatedAt?: number
}

export interface TicketMessage {
  id: string
  sequenceNo: number
  senderType: TicketSenderType
  contentType: TicketContentType
  content: string
  sentAt?: number
}

export interface CreateTicketReq {
  title: string
  content: string
}

export interface CreateTicketRes {
  success: boolean
  message: string
  ticket?: Ticket
  messageInfo?: TicketMessage
}

export interface CreateMessageReq {
  ticketId: string
  content: string
}

export interface CreateMessageRes {
  success: boolean
  message: string
  messageInfo?: TicketMessage
}

export interface PatchStatusReq {
  ticketId: string
  status: TicketStatus
  reason?: string
}

export interface PatchStatusRes {
  success: boolean
  message: string
  ticket?: Ticket
}

export interface ListTicketsReq {
  status?: TicketStatus
  limit?: number
  cursor?: string
}

export interface ListTicketsRes {
  success: boolean
  message: string
  list: Ticket[]
  nextCursor?: string
}

export interface GetMessagesReq {
  ticketId: string
  afterSequence?: number
  limit?: number
}

export interface GetMessagesRes {
  success: boolean
  message: string
  list: TicketMessage[]
  nextAfterSequence?: number
}

export interface GetTicketRes {
  success: boolean
  message: string
  ticket?: Ticket
}

export interface GetCurrentReq {
  // 无入参
}

export interface GetCurrentRes {
  success: boolean
  message: string
  ticket?: Ticket
}

export interface AiAnswerReq {
  question: string
}

export interface AiAnswerReference {
  articleId: string
  title: string
  question?: string
  content: string
  score: number
}

export interface AiAnswerRes {
  success: boolean
  message: string
  answered: boolean
  answer: string
  mode: string
  references: AiAnswerReference[]
}
