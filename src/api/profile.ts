import { endpoints, type UserProfile, type UserListRes } from '@shared/api'
import { get, post, num, str, bool, type ApiResult } from '@/lib/http'
import { normalizeStaticUrl } from '@/lib/static-url'

function normalizeProfile(raw: Record<string, unknown>): UserProfile {
  const spiders = Array.isArray(raw.spiders)
    ? (raw.spiders as Record<string, unknown>[]).map((s) => ({
        platform: str(s.platform),
        username: str(s.username),
      }))
    : []
  const lastSyncRaw = raw.lastSyncAt
  const lastSyncAt =
    lastSyncRaw === undefined || lastSyncRaw === null
      ? undefined
      : num(lastSyncRaw) || undefined
  return {
    userId: num(raw.userId),
    username: str(raw.username),
    name: str(raw.name),
    email: str(raw.email),
    groupId: num(raw.groupId),
    avatar: normalizeStaticUrl(str(raw.avatar)),
    emailEnabled: bool(raw.emailEnabled),
    emailWeeklyEnabled: bool(raw.emailWeeklyEnabled),
    emailAllowedByOrg: bool(raw.emailAllowedByOrg),
    emailWeeklyAllowedByOrg: bool(raw.emailWeeklyAllowedByOrg),
    roleId: num(raw.roleId),
    spiders,
    lastSyncAt,
  }
}

export async function getProfileById(userId: number): Promise<ApiResult<UserProfile>> {
  const res = await get<Record<string, unknown>>(endpoints.user.profile.getById, {
    userId,
  })
  if (!res.success || !res.data) return { ...res, data: null }
  return { ...res, data: normalizeProfile(res.data) }
}

export async function getProfileByUsername(
  username: string,
): Promise<ApiResult<UserProfile>> {
  const uname = username.trim()
  if (!uname) {
    return { success: false, message: '用户名无效', data: null }
  }
  // 优先精确用户名接口；未部署时回退 get-by-name + get-by-id
  const res = await get<Record<string, unknown>>(
    endpoints.user.profile.getByUsername,
    { username: uname },
  )
  if (res.success && res.data) {
    const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
    if (raw.userId !== undefined || raw.username !== undefined) {
      return { ...res, data: normalizeProfile(raw) }
    }
  }
  // 隐私/权限拒绝：不要回退模糊搜索（避免换用户或绕过提示）
  if (
    res.status === 403 ||
    (res.message &&
      (res.message.includes('隐私') ||
        res.message.includes('未开放') ||
        res.message.includes('禁止')))
  ) {
    return { ...res, data: null }
  }
  const byName = await getProfileByName(uname)
  if (!byName.success || !byName.data?.length) {
    return {
      success: false,
      message: res.message || byName.message || '找不到该用户',
      data: null,
    }
  }
  // 仅精确匹配用户名，禁止回落到模糊结果的第一项（会串号）
  const exact = byName.data.find(
    (u) => u.username.toLowerCase() === uname.toLowerCase(),
  )
  if (!exact) {
    return { success: false, message: '找不到该用户', data: null }
  }
  return getProfileById(exact.userId)
}

export async function getProfileByName(
  name: string,
): Promise<ApiResult<UserProfile[]>> {
  const res = await get<Record<string, unknown>>(endpoints.user.profile.getByName, {
    name,
  })
  if (!res.success) return { ...res, data: [] }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  let listRaw: Record<string, unknown>[] = []
  if (Array.isArray(res.data)) listRaw = res.data as Record<string, unknown>[]
  else if (Array.isArray(raw.list)) listRaw = raw.list as Record<string, unknown>[]
  else if (raw.userId !== undefined) listRaw = [raw]
  return { ...res, data: listRaw.map(normalizeProfile) }
}

export async function updateProfile(body: {
  userId: number
  email: string
  avatar?: string
  /** 修改/绑定邮箱时必填：发往新邮箱的验证码 */
  emailCode?: string
  /** @deprecated 昵称请在「我的组织」修改，服务端已忽略 */
  name?: string
}): Promise<ApiResult<unknown>> {
  return post(endpoints.user.profile.update, {
    userId: body.userId,
    email: body.email,
    avatar: body.avatar ?? '',
    emailCode: body.emailCode ?? '',
  })
}

export async function setEmailEnabled(
  userId: number,
  enabled: boolean,
  kind: 'daily' | 'weekly' = 'daily',
): Promise<ApiResult<unknown>> {
  return post(endpoints.user.profile.setEmailEnabled, { userId, enabled, kind })
}

/** 站点管理员：抓取题面 / 题面 AI 个人覆盖 */
export async function setProblemPipeline(
  userId: number,
  enabled: boolean,
  kind: 'fetch' | 'ai',
): Promise<ApiResult<unknown>> {
  return post(endpoints.user.profile.setProblemPipeline, { userId, enabled, kind })
}

/**
 * 站点管理员：个人爬取 / AI 总结间隔覆盖（优先级最高）
 * minutes 为 0 表示清除覆盖、回落组织 MIN
 */
export async function setSyncIntervals(body: {
  userId: number
  spiderIntervalMin?: number
  aiSummaryIntervalMin?: number
  setSpider?: boolean
  setAi?: boolean
}): Promise<ApiResult<unknown>> {
  return post(endpoints.user.profile.setSyncIntervals, {
    userId: body.userId,
    spiderIntervalMin: body.spiderIntervalMin ?? 0,
    aiSummaryIntervalMin: body.aiSummaryIntervalMin ?? 0,
    setSpider: body.setSpider ?? body.spiderIntervalMin !== undefined,
    setAi: body.setAi ?? body.aiSummaryIntervalMin !== undefined,
  })
}

/** 站点管理员：永不休眠（始终参与同步） */
export async function setSyncExempt(
  userId: number,
  exempt: boolean,
): Promise<ApiResult<unknown>> {
  return post(endpoints.user.profile.setSyncExempt, { userId, exempt })
}

/** 站点管理员：批量解除不活跃（刷新最近活跃为当前时间；超时后仍会再休眠） */
export async function clearDormant(
  userIds: number[],
): Promise<ApiResult<{ updated: number; message?: string }>> {
  const ids = Array.from(
    new Set(userIds.filter((id) => Number.isFinite(id) && id > 0)),
  )
  if (!ids.length) {
    return { success: false, message: '请先选择用户', data: null }
  }
  const res = await post<Record<string, unknown>>(
    endpoints.user.profile.clearDormant,
    { userIds: ids },
  )
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  const updated = num(raw.updated)
  return {
    ...res,
    data: {
      updated,
      message: str(raw.message) || res.message || undefined,
    },
  }
}

export async function moveGroup(body: {
  userId: number
  groupId: number
}): Promise<ApiResult<unknown>> {
  return post(endpoints.user.profile.moveGroup, body)
}

export async function deleteUser(userId: number): Promise<ApiResult<unknown>> {
  return post(endpoints.user.profile.delete, { userId })
}

export async function listProfiles(
  pageNum = 1,
  pageSize = 10,
  scope?: 'org' | 'site',
  keyword?: string,
  opts?: { dormantOnly?: boolean },
): Promise<ApiResult<UserListRes>> {
  const kw = keyword?.trim()
  const res = await get<Record<string, unknown>>(endpoints.user.profile.list, {
    pageNum,
    pageSize,
    ...(scope ? { scope } : {}),
    ...(kw ? { keyword: kw } : {}),
    // 同时传 dormantOnly 与 dormant，兼容 query 绑定差异
    ...(opts?.dormantOnly ? { dormantOnly: true, dormant: true } : {}),
  })
  // list 可能无 success 字段，裸 { list, total }
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = (Array.isArray(raw.list)
    ? raw.list
    : Array.isArray(res.data)
      ? res.data
      : ((raw as { list?: unknown }).list as Record<string, unknown>[] | undefined) ||
        []) as Record<string, unknown>[]

  if (!res.success && !listRaw.length && raw.list === undefined) {
    return { ...res, data: null }
  }

  return {
    success: true,
    message: res.message || 'ok',
    data: {
      total: num(raw.total, listRaw.length),
      list: listRaw.map((u) => {
        const orgsRaw = Array.isArray(u.orgs) ? (u.orgs as Record<string, unknown>[]) : []
        return {
          userId: num(u.userId),
          username: str(u.username),
          name: str(u.name),
          groupId: num(u.groupId),
          groupName: str(u.groupName) || undefined,
          avatar: normalizeStaticUrl(str(u.avatar)),
          lastSubmit: str(u.lastSubmit),
          roleId: num(u.roleId),
          isSiteAdmin: bool(u.isSiteAdmin),
          emailEnabled: bool(u.emailEnabled),
          emailWeeklyEnabled: bool(u.emailWeeklyEnabled),
          // 字段缺失时保持 undefined，UI 按「可开」处理（兼容未部署新后端）
          emailAllowedByOrg:
            u.emailAllowedByOrg === undefined
              ? undefined
              : bool(u.emailAllowedByOrg),
          emailWeeklyAllowedByOrg:
            u.emailWeeklyAllowedByOrg === undefined
              ? undefined
              : bool(u.emailWeeklyAllowedByOrg),
          problemFetchEnabled:
            u.problemFetchEnabled === undefined
              ? undefined
              : bool(u.problemFetchEnabled),
          problemAiEnabled:
            u.problemAiEnabled === undefined
              ? undefined
              : bool(u.problemAiEnabled),
          // 注册时间 unix 秒；旧后端可能无此字段
          createdAt:
            u.createdAt === undefined || u.createdAt === null
              ? undefined
              : num(u.createdAt) || undefined,
          spiderIntervalMin:
            u.spiderIntervalMin === undefined
              ? undefined
              : num(u.spiderIntervalMin) || undefined,
          aiSummaryIntervalMin:
            u.aiSummaryIntervalMin === undefined
              ? undefined
              : num(u.aiSummaryIntervalMin) || undefined,
          spiderIntervalOverridden:
            u.spiderIntervalOverridden === undefined
              ? undefined
              : bool(u.spiderIntervalOverridden),
          aiSummaryIntervalOverridden:
            u.aiSummaryIntervalOverridden === undefined
              ? undefined
              : bool(u.aiSummaryIntervalOverridden),
          syncExempt:
            u.syncExempt === undefined ? undefined : bool(u.syncExempt),
          lastLoginAt:
            u.lastLoginAt === undefined || u.lastLoginAt === null
              ? undefined
              : num(u.lastLoginAt) || undefined,
          dormant: u.dormant === undefined ? undefined : bool(u.dormant),
          orgs: orgsRaw.map((o) => ({
            orgId: num(o.orgId),
            name: str(o.name),
            role: str(o.role),
          })),
        }
      }),
    },
    raw: res.raw,
  }
}

export async function setSiteAdmin(
  userId: number,
  isSiteAdmin: boolean,
): Promise<ApiResult<unknown>> {
  return post(endpoints.user.platform.setSiteAdmin, { userId, isSiteAdmin })
}
