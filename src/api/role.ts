import { endpoints, type RoleInfo } from '@shared/api'
import { get, post, num, str, type ApiResult } from '@/lib/http'

export async function listRoles(): Promise<ApiResult<RoleInfo[]>> {
  const res = await get<Record<string, unknown>>(endpoints.user.role.list)
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  const listRaw = (Array.isArray(raw.roles)
    ? raw.roles
    : Array.isArray(res.data)
      ? res.data
      : []) as Record<string, unknown>[]
  return {
    success: true,
    message: res.message || 'ok',
    data: listRaw.map((r) => ({
      roleId: num(r.roleId),
      name: str(r.name),
    })),
    raw: res.raw,
  }
}

export async function setUserRole(body: {
  userId: number
  roleId: number
}): Promise<ApiResult<unknown>> {
  return post(endpoints.user.role.setUserRole, body)
}
