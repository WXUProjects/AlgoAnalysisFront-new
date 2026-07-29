import {
  endpoints,
  type MyPermissionsRes,
  type PermGroup,
  type PermScope,
  type RbacRole,
  type RbacRoleMember,
} from '@shared/api'
import { get, post } from '@/lib/http'

function bizOk(code: unknown): boolean {
  return code === undefined || code === null || code === 0 || code === '0'
}

type Body = { code?: number; message?: string } & Record<string, unknown>

function unwrap(res: { success: boolean; message: string; data?: unknown; raw?: unknown }) {
  const body = (res.data ?? res.raw ?? {}) as Body
  return {
    body,
    success: res.success && bizOk(body.code),
    message: body.message || res.message,
  }
}

/** 权限目录（分组，供勾选矩阵渲染） */
export async function listPermissionGroups() {
  const res = await get<Body>(endpoints.user.rbac.permissions)
  const { body, success, message } = unwrap(res)
  return {
    success,
    message,
    groups: (Array.isArray(body.groups) ? body.groups : []) as PermGroup[],
  }
}

/** 角色列表：scope=site 站点级；scope=org 为全局模板 + 该组织自定义 */
export async function listRoles(scope: PermScope, orgId?: number) {
  const params: Record<string, string> = { scope }
  if (orgId) params.orgId = String(orgId)
  const res = await get<Body>(endpoints.user.rbac.roles, params)
  const { body, success, message } = unwrap(res)
  return {
    success,
    message,
    list: (Array.isArray(body.list) ? body.list : []) as RbacRole[],
  }
}

export async function createRole(input: {
  scope: PermScope
  orgId?: number
  name: string
  description?: string
  permissions: string[]
}) {
  const res = await post<Body>(endpoints.user.rbac.roleCreate, input)
  const { body, success, message } = unwrap(res)
  return { success, message, data: body.data as RbacRole | undefined }
}

/**
 * 保存角色。自定义角色可改名称/说明/权限；
 * 内置的教练 / 队长只能改权限，且只作用于 orgId 指定的组织（resetPermissions 恢复默认）。
 */
export async function updateRole(input: {
  roleId: number
  orgId?: number
  name?: string
  description?: string
  permissions?: string[]
  resetPermissions?: boolean
}) {
  const res = await post<Body>(endpoints.user.rbac.roleUpdate, input)
  const { success, message } = unwrap(res)
  return { success, message }
}

export async function deleteRole(roleId: number) {
  const res = await post<Body>(endpoints.user.rbac.roleDelete, { roleId })
  const { success, message } = unwrap(res)
  return { success, message }
}

/** 角色成员（分页 + 模糊搜索；系统组织角色需传 orgId） */
export async function listRoleMembers(params: {
  roleId: number
  orgId?: number
  page?: number
  pageSize?: number
  keyword?: string
}) {
  const query: Record<string, string> = { roleId: String(params.roleId) }
  if (params.orgId) query.orgId = String(params.orgId)
  if (params.page) query.page = String(params.page)
  if (params.pageSize) query.pageSize = String(params.pageSize)
  if (params.keyword) query.keyword = params.keyword
  const res = await get<Body>(endpoints.user.rbac.roleMembers, query)
  const { body, success, message } = unwrap(res)
  return {
    success,
    message,
    list: (Array.isArray(body.list) ? body.list : []) as RbacRoleMember[],
    total: typeof body.total === 'number' ? body.total : 0,
  }
}

/** 一次查询用户持有的角色 id（替代按角色 N+1 listRoleMembers） */
export async function listUserRoles(params: {
  userId: number
  scope?: PermScope
  orgId?: number
}) {
  const query: Record<string, string> = { userId: String(params.userId) }
  if (params.scope) query.scope = params.scope
  if (params.orgId) query.orgId = String(params.orgId)
  const res = await get<Body>(endpoints.user.rbac.userRoles, query)
  const { body, success, message } = unwrap(res)
  const list = Array.isArray(body.list) ? body.list : Array.isArray(body.roleIds) ? body.roleIds : []
  const roleIds: number[] = []
  for (const item of list) {
    if (typeof item === 'number') {
      roleIds.push(item)
      continue
    }
    if (item && typeof item === 'object') {
      const r = item as Record<string, unknown>
      const id = Number(r.roleId ?? r.id)
      if (Number.isFinite(id) && id > 0) roleIds.push(id)
    }
  }
  return { success, message, roleIds }
}

/** 把用户拉入自定义角色（内置角色请走成员管理/全站用户任命） */
export async function assignRole(roleId: number, userIds: number[]) {
  const res = await post<Body>(endpoints.user.rbac.roleAssign, { roleId, userIds })
  const { body, success, message } = unwrap(res)
  return {
    success,
    message,
    added: typeof body.added === 'number' ? body.added : 0,
    skipped: (Array.isArray(body.skipped) ? body.skipped : []) as number[],
  }
}

export async function unassignRole(roleId: number, userIds: number[]) {
  const res = await post<Body>(endpoints.user.rbac.roleUnassign, { roleId, userIds })
  const { success, message } = unwrap(res)
  return { success, message }
}

/** 当前用户实时权限（查库；调试/兜底用，日常判定走 AuthContext.can） */
export async function fetchMyPermissions() {
  const res = await get<Body>(endpoints.user.rbac.myPermissions)
  const { body, success, message } = unwrap(res)
  return { success, message, data: success ? (body as unknown as MyPermissionsRes) : null }
}
