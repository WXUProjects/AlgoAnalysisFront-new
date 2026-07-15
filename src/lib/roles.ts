/** 角色：兼容旧 roleId + GoAlgo isSiteAdmin / orgRole */

export const Role = {
  Member: 0,
  Admin: 1,
  Coach: 2,
  Captain: 3,
} as const

export type RoleId = (typeof Role)[keyof typeof Role]

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
  return Boolean(p.isSiteAdmin) || p.roleId === Role.Admin
}

export function isOrgAdminFromPayload(p?: {
  orgRole?: string
  isSiteAdmin?: boolean
  roleId?: number | null
} | null) {
  if (!p) return false
  if (isSiteAdminFromPayload(p)) return true
  return p.orgRole === 'org_admin'
}

/** @deprecated 用 isSiteAdminFromPayload */
export function isAdminRole(roleId?: number | null) {
  return roleId === Role.Admin
}

export function isCoachOnlyRole(roleId?: number | null) {
  return roleId === Role.Coach
}

export function isCaptainRole(roleId?: number | null) {
  return roleId === Role.Captain
}

/** 管理端：站点管理员或当前组织管理员（兼容旧 staff） */
export function isStaffFromPayload(p?: {
  isSiteAdmin?: boolean
  orgRole?: string
  roleId?: number | null
} | null) {
  if (!p) return false
  if (isSiteAdminFromPayload(p) || p.orgRole === 'org_admin') return true
  return (
    p.roleId === Role.Admin || p.roleId === Role.Coach || p.roleId === Role.Captain
  )
}

export function isStaffRole(roleId?: number | null) {
  return (
    roleId === Role.Admin || roleId === Role.Coach || roleId === Role.Captain
  )
}

/** 队员侧：所有登录用户均可（不再排除纯教练） */
export function isMemberLikeRole(roleId?: number | null) {
  return (
    roleId === Role.Member ||
    roleId === Role.Captain ||
    roleId === Role.Admin ||
    roleId === Role.Coach ||
    roleId === undefined ||
    roleId === null
  )
}

export function roleName(roleId?: number | null) {
  if (roleId === undefined || roleId === null) return '未知'
  return RoleLabel[roleId] ?? `角色${roleId}`
}
