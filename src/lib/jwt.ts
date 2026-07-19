import { jwtDecode } from 'jwt-decode'

export interface JwtPayload {
  exp: number
  nbf?: number
  userId: number
  username: string
  name: string
  roleId: number
  isSiteAdmin?: boolean
  orgId?: number
  orgRole?: string
}

let memoryToken = ''

export const jwt = {
  get token(): string {
    return memoryToken
  },

  set token(value: string) {
    memoryToken = value
  },

  setNewToken(token: string) {
    this.token = token
  },

  clearToken() {
    this.token = ''
  },

  getUserInfo(): JwtPayload | null {
    if (!this.isValid()) return null
    try {
      return jwtDecode<JwtPayload>(this.token)
    } catch {
      this.clearToken()
      return null
    }
  },

  isTokenExpired(): boolean {
    const info = this.decodeUnsafe()
    if (!info?.exp) {
      this.clearToken()
      return true
    }
    const now = Math.floor(Date.now() / 1000) + 60
    if (info.exp < now) {
      this.clearToken()
      return true
    }
    return false
  },

  isValid(): boolean {
    if (!this.token) return false
    return !this.isTokenExpired()
  },

  decodeUnsafe(): JwtPayload | null {
    if (!this.token) return null
    try {
      return jwtDecode<JwtPayload>(this.token)
    } catch {
      this.clearToken()
      return null
    }
  },

  /** 剩余有效秒数；无效/无 token 返回 0 */
  remainingSeconds(): number {
    const info = this.decodeUnsafe()
    if (!info?.exp) return 0
    return Math.max(0, info.exp - Math.floor(Date.now() / 1000))
  },
}

/** 比较 JWT 业务字段是否实质相同（忽略 iat/exp 抖动导致的无意义 setState） */
export function jwtPayloadEquals(
  a: JwtPayload | null,
  b: JwtPayload | null,
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.userId === b.userId &&
    a.username === b.username &&
    a.name === b.name &&
    a.roleId === b.roleId &&
    Boolean(a.isSiteAdmin) === Boolean(b.isSiteAdmin) &&
    (a.orgId ?? 0) === (b.orgId ?? 0) &&
    (a.orgRole ?? '') === (b.orgRole ?? '')
  )
}
