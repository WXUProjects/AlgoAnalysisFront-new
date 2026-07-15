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

const TOKEN_KEY = 'jwtToken'

let memoryToken = ''

export const jwt = {
  get token(): string {
    if (!memoryToken) {
      memoryToken = localStorage.getItem(TOKEN_KEY) || ''
    }
    return memoryToken
  },

  set token(value: string) {
    memoryToken = value
    if (value) {
      localStorage.setItem(TOKEN_KEY, value)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  },

  setNewToken(token: string) {
    this.token = token
  },

  clearToken() {
    this.token = ''
    memoryToken = ''
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
}
