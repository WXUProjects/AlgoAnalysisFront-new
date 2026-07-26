/**
 * 细粒度权限（RBAC）。
 * 权威目录在后端 `cwxu-algo/app/common/rbac/perm.go`，本文件的 code 与 bit 位序必须与其严格一致；
 * 新增权限点只能在末尾追加 bit，永不复用/改号。
 * JWT `pm` claim 为 base64url 权限位图（站点权限 ∪ 当前组织权限）；
 * 旧 token（无 pm）按 isSiteAdmin / isResourceReviewer / orgRole 模板推导，行为与后端一致。
 */

export const Perm = {
  // 站点 · 配置运维
  SiteConfigRead: 'site.config.read',
  SiteConfigWrite: 'site.config.write',
  SiteStatsRead: 'site.stats.read',
  SiteBackup: 'site.backup.manage',
  SiteSpiderOps: 'site.spider.ops',
  SiteProblemOps: 'site.problem.ops',
  SiteBlogBoard: 'site.blog.dashboard',
  // 站点 · 组织治理
  SiteOrgCreate: 'site.org.create',
  SiteOrgDelete: 'site.org.delete',
  SiteOrgPolicy: 'site.org.policy',
  SiteOrgList: 'site.org.list',
  // 站点 · 用户运维
  SiteUserList: 'site.user.list',
  SiteUserDisable: 'site.user.disable',
  SiteUserDelete: 'site.user.delete',
  SiteUserSync: 'site.user.sync',
  // 站点 · 任命与角色
  SiteAppointAdmin: 'site.appoint.admin',
  SiteAppointReviewer: 'site.appoint.reviewer',
  SiteRoleManage: 'site.role.manage',
  // 站点 · 公告通知
  SiteBulletin: 'site.bulletin.manage',
  SiteEmergency: 'site.emergency.manage',
  // 内容审核
  ContentProblemReview: 'content.problem.review',
  ContentBlogModerate: 'content.blog.moderate',
  ContentCommunityMod: 'content.community.moderate',
  ContentReportHandle: 'content.report.handle',
  // 组织 · 设置
  OrgInfoWrite: 'org.info.write',
  OrgPolicyToggle: 'org.policy.toggle',
  OrgRoleManage: 'org.role.manage',
  // 组织 · 成员
  OrgMemberAdd: 'org.member.add',
  OrgMemberRemove: 'org.member.remove',
  OrgMemberRole: 'org.member.role',
  OrgMemberDisplayName: 'org.member.display-name',
  OrgInviteView: 'org.invite.view',
  OrgInviteRotate: 'org.invite.rotate',
  OrgJoinReview: 'org.join.review',
  // 组织 · 日常管理
  OrgGroupManage: 'org.group.manage',
  OrgBulletinManage: 'org.bulletin.manage',
  OrgReportView: 'org.report.view',
  OrgMemberEmail: 'org.member.email',
} as const

export type PermCode = (typeof Perm)[keyof typeof Perm]

/** bit 位序（与后端注册表严格一致，勿改顺序） */
const PERM_ORDER: PermCode[] = [
  Perm.SiteConfigRead,
  Perm.SiteConfigWrite,
  Perm.SiteStatsRead,
  Perm.SiteBackup,
  Perm.SiteSpiderOps,
  Perm.SiteProblemOps,
  Perm.SiteBlogBoard,
  Perm.SiteOrgCreate,
  Perm.SiteOrgDelete,
  Perm.SiteOrgPolicy,
  Perm.SiteOrgList,
  Perm.SiteUserList,
  Perm.SiteUserDisable,
  Perm.SiteUserDelete,
  Perm.SiteUserSync,
  Perm.SiteAppointAdmin,
  Perm.SiteAppointReviewer,
  Perm.SiteRoleManage,
  Perm.SiteBulletin,
  Perm.SiteEmergency,
  Perm.ContentProblemReview,
  Perm.ContentBlogModerate,
  Perm.ContentCommunityMod,
  Perm.OrgInfoWrite,
  Perm.OrgPolicyToggle,
  Perm.OrgRoleManage,
  Perm.OrgMemberAdd,
  Perm.OrgMemberRemove,
  Perm.OrgMemberRole,
  Perm.OrgMemberDisplayName,
  Perm.OrgInviteView,
  Perm.OrgInviteRotate,
  Perm.OrgJoinReview,
  Perm.OrgGroupManage,
  Perm.OrgBulletinManage,
  Perm.OrgReportView,
  Perm.OrgMemberEmail,
  // bit 只追加：content 组新增位排在末尾（与后端注册表一致）
  Perm.ContentReportHandle,
]

export const ALL_PERMS: readonly PermCode[] = PERM_ORDER

/** 内容审核（资源审核员模板） */
export const REVIEWER_PERMS: readonly PermCode[] = [
  Perm.ContentProblemReview,
  Perm.ContentBlogModerate,
  Perm.ContentCommunityMod,
  Perm.ContentReportHandle,
]

/** 教练/队长模板（现状两者相同） */
export const ORG_STAFF_PERMS: readonly PermCode[] = [
  Perm.OrgGroupManage,
  Perm.OrgBulletinManage,
  Perm.OrgReportView,
  Perm.OrgMemberEmail,
]

/** 团队管理员模板 = 全部组织级权限 */
export const ORG_ADMIN_PERMS: readonly PermCode[] = PERM_ORDER.filter((c) =>
  c.startsWith('org.'),
)

/** base64url 权限位图 → 权限集合；解码失败返回 null（调用方走旧字段推导） */
export function decodePermMask(mask?: string | null): Set<string> | null {
  if (!mask) return null
  try {
    const b64 = mask.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64)
    const out = new Set<string>()
    PERM_ORDER.forEach((code, bit) => {
      const idx = Math.floor(bit / 8)
      if (idx < bin.length && (bin.charCodeAt(idx) & (1 << bit % 8)) !== 0) {
        out.add(code)
      }
    })
    return out
  } catch {
    return null
  }
}

interface PermPayload {
  isSiteAdmin?: boolean
  roleId?: number | null
  isResourceReviewer?: boolean
  orgRole?: string
  pm?: string
}

/**
 * payload → 有效权限集合。
 * 站点管理员旁路（返回全量）；否则 pm 位图；旧 token 按审核员/组织角色模板推导。
 */
export function permsFromPayload(p?: PermPayload | null): Set<string> {
  if (!p) return new Set()
  if (p.isSiteAdmin || p.roleId === 1) return new Set(ALL_PERMS)
  const fromMask = decodePermMask(p.pm)
  if (fromMask) return fromMask
  const out = new Set<string>()
  if (p.isResourceReviewer) REVIEWER_PERMS.forEach((c) => out.add(c))
  if (p.orgRole === 'org_admin') ORG_ADMIN_PERMS.forEach((c) => out.add(c))
  else if (p.orgRole === 'coach' || p.orgRole === 'captain')
    ORG_STAFF_PERMS.forEach((c) => out.add(c))
  return out
}

export function hasPermFromPayload(
  p: PermPayload | null | undefined,
  code: string,
): boolean {
  return permsFromPayload(p).has(code)
}

/** 权限集合是否含任意管理入口（决定是否展示管理后台入口） */
export function hasAnyAdminPerm(perms: Set<string>): boolean {
  return perms.size > 0
}
