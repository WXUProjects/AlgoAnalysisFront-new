/** 角色：GoAlgo isSiteAdmin + 组织内 orgRole */

/**
 * 组织内角色（展示顺序：成员 → 队长 → 组长 → 教练 → 组织管理员）
 * 等级：org_admin > coach > group_leader > captain > member
 */
export const OrgRole = {
  Member: 'member',
  Captain: 'captain',
  GroupLeader: 'group_leader',
  Coach: 'coach',
  OrgAdmin: 'org_admin',
} as const

export type OrgRoleValue = (typeof OrgRole)[keyof typeof OrgRole]

export const OrgRoleLabel: Record<string, string> = {
  member: '成员',
  captain: '队长',
  group_leader: '组长',
  coach: '教练',
  org_admin: '组织管理员',
}

/** 角色等级（越高权限越大），与后端 model.OrgRoleRank 对齐 */
export const OrgRoleRank: Record<string, number> = {
  member: 0,
  captain: 10,
  group_leader: 20,
  coach: 30,
  org_admin: 40,
}

export function orgRoleRank(role?: string | null): number {
  if (!role) return 0
  return OrgRoleRank[role] ?? 0
}

const ALL_ORG_ROLES: OrgRoleValue[] = [
  OrgRole.Member,
  OrgRole.Captain,
  OrgRole.GroupLeader,
  OrgRole.Coach,
  OrgRole.OrgAdmin,
]

/**
 * 操作者可任命的角色列表（按操作者等级粗筛）。
 * - 站管 / 组织管理员：本组织全部五档（含组织管理员）
 * - 其余：自己同级及以下（可把下级提高到与自己同级）；队长及以下无任命权
 * 是否可改某个具体成员仍要叠加目标当前角色判定（见 canGrantOrgRole）。
 */
export function appointableRoles(
  actorRole?: string | null,
  opts?: { isSiteAdmin?: boolean },
): OrgRoleValue[] {
  if (opts?.isSiteAdmin || actorRole === OrgRole.OrgAdmin) {
    return [...ALL_ORG_ROLES]
  }
  const ar = orgRoleRank(actorRole)
  if (ar < OrgRoleRank.group_leader) return []
  return ALL_ORG_ROLES.filter((r) => orgRoleRank(r) <= ar)
}

/**
 * 操作者能否把某目标改到 newRole（对齐后端 model.CanAppointOrgRole）：
 * 高可随便动低；同级别可提到自己同级但不许降；不可动更高/授予更高。
 */
export function canGrantOrgRole(
  actorRole?: string | null,
  targetCurrentRole?: string | null,
  newRole?: string | null,
  opts?: { isSiteAdmin?: boolean },
): boolean {
  if (opts?.isSiteAdmin) return true
  const ar = orgRoleRank(actorRole)
  if (ar < OrgRoleRank.group_leader) return false
  if (orgRoleRank(newRole) > ar) return false
  const tr = orgRoleRank(targetCurrentRole)
  if (tr > ar) return false
  if (tr === ar && orgRoleRank(newRole) < ar) return false
  return true
}

/** 操作者能否移除某成员：只能移除严格低于自己的（站管除外） */
export function canRemoveOrgRole(
  actorRole?: string | null,
  targetRole?: string | null,
  opts?: { isSiteAdmin?: boolean },
): boolean {
  if (opts?.isSiteAdmin) return true
  return orgRoleRank(targetRole) < orgRoleRank(actorRole)
}

/** 该角色任命时是否需要绑定范围 */
export function roleNeedsScope(
  role?: string | null,
): 'group' | 'squad' | null {
  if (role === OrgRole.GroupLeader) return 'group'
  if (role === OrgRole.Captain) return 'squad'
  return null
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

export function isGroupLeaderFromPayload(p?: {
  orgRole?: string
} | null) {
  if (!p) return false
  return p.orgRole === OrgRole.GroupLeader
}

export function isCaptainFromPayload(p?: {
  orgRole?: string
  roleId?: number | null
} | null) {
  if (!p) return false
  return p.orgRole === OrgRole.Captain
}

/** 组织内可进管理端：教练 / 组长 / 队长 / 组织管理员 */
export function isOrgStaffRole(orgRole?: string | null) {
  return (
    orgRole === OrgRole.Coach ||
    orgRole === OrgRole.GroupLeader ||
    orgRole === OrgRole.Captain ||
    orgRole === OrgRole.OrgAdmin
  )
}

/** 管理端：站点管理员或当前组织教练/组长/队长/管理员 */
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

/** 导航文案推导所需的 payload 子集（JWT payload 结构兼容） */
export type StaffLabelPayload = {
  isSiteAdmin?: boolean
  orgRole?: string
  roleId?: number | null
}

/** 管理端内置身份类别（自定义角色仅有权限、不落入任何类别） */
export type StaffKind =
  | 'siteAdmin'
  | 'orgAdmin'
  | 'coach'
  | 'groupLeader'
  | 'captain'

/**
 * 管理入口文案有序规则表（自上而下，命中即止）：
 * 站点管理员 → 组织管理员 → 教练 → 组长 → 队长。
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
    kind: 'groupLeader',
    when: (p) => p.orgRole === OrgRole.GroupLeader,
    sidebar: '组长管理',
    bottom: '组长管理',
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

/** 侧栏管理入口文案（组织管理员显示「团队管理」） */
export function staffNavLabel(p?: StaffLabelPayload | null): string {
  return staffLabelByVariant(p, 'sidebar')
}

/** 底栏管理入口文案（组织管理员显示「组织管理」，与「更多」分区一致） */
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
