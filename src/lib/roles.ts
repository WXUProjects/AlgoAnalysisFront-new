/** 角色：GoAlgo isSiteAdmin + 组织内 orgRole */

export const Role = {
  Member: 0,
  Admin: 1,
  /** @deprecated 旧全局教练；已迁移为 orgRole */
  Coach: 2,
  /** @deprecated 旧全局队长；已迁移为 orgRole */
  Captain: 3,
} as const

export type RoleId = (typeof Role)[keyof typeof Role]

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

export const RoleLabel: Record<number, string> = {
  [Role.Member]: '队员',
  [Role.Admin]: '站点管理员',
  [Role.Coach]: '教练',
  [Role.Captain]: '队长',
}

export function isSiteAdminFromPayload(p?: {
  isSiteAdmin?: boolean
  roleId?: number | null
} | null) {
  if (!p) return false
  // roleId===1 仍为历史站管标记；新路径以 isSiteAdmin 为准
  return Boolean(p.isSiteAdmin) || p.roleId === Role.Admin
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

/** @deprecated 用 isSiteAdminFromPayload */
export function isAdminRole(roleId?: number | null) {
  return roleId === Role.Admin
}

/** @deprecated 旧全局 roleId；请用 isCoachFromPayload */
export function isCoachOnlyRole(roleId?: number | null) {
  return roleId === Role.Coach
}

/** @deprecated 旧全局 roleId；请用 isCaptainFromPayload */
export function isCaptainRole(roleId?: number | null) {
  return roleId === Role.Captain
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

/** @deprecated 用 isStaffFromPayload */
export function isStaffRole(roleId?: number | null) {
  return (
    roleId === Role.Admin || roleId === Role.Coach || roleId === Role.Captain
  )
}

/** 队员侧能力：任意登录用户均可（含教练） */
export function isMemberLikeRole(_roleId?: number | null) {
  return true
}

export function roleName(roleId?: number | null) {
  if (roleId === undefined || roleId === null) return '未知'
  return RoleLabel[roleId] ?? `角色${roleId}`
}

export function orgRoleName(role?: string | null) {
  if (!role) return '成员'
  return OrgRoleLabel[role] ?? role
}

/** 侧栏管理入口文案 */
export function staffNavLabel(p?: {
  isSiteAdmin?: boolean
  orgRole?: string
  roleId?: number | null
} | null) {
  if (isSiteAdminFromPayload(p)) return '站点管理'
  if (p?.orgRole === OrgRole.OrgAdmin) return '团队管理'
  if (p?.orgRole === OrgRole.Coach) return '教练管理'
  if (p?.orgRole === OrgRole.Captain) return '队长管理'
  return '团队管理'
}
