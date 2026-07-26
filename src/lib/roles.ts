/** 角色：GoAlgo isSiteAdmin + 组织内 orgRole */

/** 组织内角色（展示顺序：成员 → 队长 → 教练 → 团队管理员） */
export const OrgRole = {
  Member: 'member',
  Captain: 'captain',
  Coach: 'coach',
  OrgAdmin: 'org_admin',
} as const

export type OrgRoleValue = (typeof OrgRole)[keyof typeof OrgRole]

export const OrgRoleLabel: Record<string, string> = {
  member: '成员',
  captain: '队长',
  coach: '教练',
  org_admin: '团队管理员',
}

export function isSiteAdminFromPayload(p?: {
  isSiteAdmin?: boolean
  roleId?: number | null
} | null) {
  if (!p) return false
  // roleId===1 为历史站管标记（旧 token 兼容）；新路径以 isSiteAdmin 为准
  return Boolean(p.isSiteAdmin) || p.roleId === 1
}

export function isOrgAdminFromPayload(p?: {
  orgRole?: string
  isSiteAdmin?: boolean
  roleId?: number | null
} | null) {
  if (!p) return false
  if (isSiteAdminFromPayload(p)) return true
  return p.orgRole === OrgRole.OrgAdmin
}

export function isCoachFromPayload(p?: {
  orgRole?: string
  roleId?: number | null
} | null) {
  if (!p) return false
  return p.orgRole === OrgRole.Coach
}

export function isCaptainFromPayload(p?: {
  orgRole?: string
  roleId?: number | null
} | null) {
  if (!p) return false
  return p.orgRole === OrgRole.Captain
}

/** 组织内可进管理端：教练 / 队长 / 团队管理员 */
export function isOrgStaffRole(orgRole?: string | null) {
  return (
    orgRole === OrgRole.Coach ||
    orgRole === OrgRole.Captain ||
    orgRole === OrgRole.OrgAdmin
  )
}

/** 管理端：站点管理员或当前组织教练/队长/管理员 */
export function isStaffFromPayload(p?: {
  isSiteAdmin?: boolean
  orgRole?: string
  roleId?: number | null
} | null) {
  if (!p) return false
  return isSiteAdminFromPayload(p) || isOrgStaffRole(p.orgRole)
}

export function orgRoleName(role?: string | null) {
  if (!role) return '成员'
  return OrgRoleLabel[role] ?? role
}

/** 站点内置身份（互斥，按权限从大到小：站点管理员 → 普通用户） */
export const SiteIdentity = {
  Admin: 'site_admin',
  User: 'user',
} as const

export type SiteIdentityValue = (typeof SiteIdentity)[keyof typeof SiteIdentity]

/** 下拉展示顺序：权限从大到小 */
export const SITE_IDENTITY_ORDER = [
  SiteIdentity.Admin,
  SiteIdentity.User,
] as const

export const SiteIdentityLabel: Record<string, string> = {
  site_admin: '站点管理员',
  user: '普通用户',
}

export function siteIdentityName(v?: string | null) {
  if (!v) return SiteIdentityLabel[SiteIdentity.User]
  return SiteIdentityLabel[v] ?? v
}

/** 由用户标记推导当前站点身份 */
export function siteIdentityOf(u?: {
  isSiteAdmin?: boolean
} | null): SiteIdentityValue {
  if (u?.isSiteAdmin) return SiteIdentity.Admin
  return SiteIdentity.User
}

/** 导航文案推导所需的 payload 子集（JWT payload 结构兼容） */
export type StaffLabelPayload = {
  isSiteAdmin?: boolean
  orgRole?: string
  roleId?: number | null
}

/** 管理端内置身份类别（自定义角色仅有权限、不落入任何类别） */
export type StaffKind = 'siteAdmin' | 'orgAdmin' | 'coach' | 'captain'

/**
 * 管理入口文案有序规则表（自上而下，命中即止）：
 * 站点管理员 → 团队管理员 → 教练 → 队长。
 * 侧栏与底栏仅团队管理员一条文案不同（侧栏「团队管理」/ 底栏「组织管理」）。
 */
const STAFF_NAV_RULES: ReadonlyArray<{
  kind: StaffKind
  when: (p: StaffLabelPayload) => boolean
  sidebar: string
  bottom: string
}> = [
  {
    kind: 'siteAdmin',
    when: (p) => isSiteAdminFromPayload(p),
    sidebar: '站点管理',
    bottom: '站点管理',
  },
  {
    kind: 'orgAdmin',
    when: (p) => p.orgRole === OrgRole.OrgAdmin,
    sidebar: '团队管理',
    bottom: '组织管理',
  },
  {
    kind: 'coach',
    when: (p) => p.orgRole === OrgRole.Coach,
    sidebar: '教练管理',
    bottom: '教练管理',
  },
  {
    kind: 'captain',
    when: (p) => p.orgRole === OrgRole.Captain,
    sidebar: '队长管理',
    bottom: '队长管理',
  },
]

/** 无内置角色、仅持自定义角色权限时的管理入口回退文案 */
export const STAFF_NAV_FALLBACK_LABEL = '管理中心'

/** 按有序规则表判定内置管理身份；无内置角色（自定义角色）返回 null */
export function staffKindFromPayload(
  p?: StaffLabelPayload | null,
): StaffKind | null {
  if (!p) return null
  return STAFF_NAV_RULES.find((r) => r.when(p))?.kind ?? null
}

function staffLabelByVariant(
  p: StaffLabelPayload | null | undefined,
  variant: 'sidebar' | 'bottom',
): string {
  if (!p) return STAFF_NAV_FALLBACK_LABEL
  const rule = STAFF_NAV_RULES.find((r) => r.when(p))
  return rule ? rule[variant] : STAFF_NAV_FALLBACK_LABEL
}

/** 侧栏管理入口文案（团队管理员显示「团队管理」） */
export function staffNavLabel(p?: StaffLabelPayload | null): string {
  return staffLabelByVariant(p, 'sidebar')
}

/** 底栏管理入口文案（团队管理员显示「组织管理」，与「更多」分区一致） */
export function bottomNavStaffLabel(p?: StaffLabelPayload | null): string {
  return staffLabelByVariant(p, 'bottom')
}

/** 管理端入口：组织 staff 或站管（自定义角色另按权限判定） */
export function canAccessAdminFromPayload(p?: {
  isSiteAdmin?: boolean
  orgRole?: string
  roleId?: number | null
} | null) {
  if (!p) return false
  return isStaffFromPayload(p)
}
