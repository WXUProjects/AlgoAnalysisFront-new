/** 角色 ID：与后端 permission 一致 */
export const Role = {
  Member: 0,
  Admin: 1,
  Coach: 2,
  Captain: 3,
} as const

export type RoleId = (typeof Role)[keyof typeof Role]

export const RoleLabel: Record<number, string> = {
  [Role.Member]: '队员',
  [Role.Admin]: '管理员',
  [Role.Coach]: '教练',
  [Role.Captain]: '队长',
}

export function isAdminRole(roleId?: number | null) {
  return roleId === Role.Admin
}

/** 纯教练：管理端，不走队员资料 */
export function isCoachOnlyRole(roleId?: number | null) {
  return roleId === Role.Coach
}

export function isCaptainRole(roleId?: number | null) {
  return roleId === Role.Captain
}

/** 管理端入口：管理员 / 教练 / 队长 */
export function isStaffRole(roleId?: number | null) {
  return (
    roleId === Role.Admin || roleId === Role.Coach || roleId === Role.Captain
  )
}

/** 队员侧能力（资料、交题等）：队员 / 队长 / 管理员；纯教练除外 */
export function isMemberLikeRole(roleId?: number | null) {
  return (
    roleId === Role.Member ||
    roleId === Role.Captain ||
    roleId === Role.Admin
  )
}

export function roleName(roleId?: number | null) {
  if (roleId === undefined || roleId === null) return '未知'
  return RoleLabel[roleId] ?? `角色${roleId}`
}
