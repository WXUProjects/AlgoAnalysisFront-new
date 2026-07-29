import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { jwt } from '@/lib/jwt'
import {
  UX_FORBIDDEN,
  UX_NETWORK,
  UX_REQUEST_FAILED,
  UX_SERVICE_UNAVAILABLE,
  sanitizeUserMessage,
} from '@/lib/ux-copy'

export interface ApiResult<T = unknown> {
  success: boolean
  message: string
  data: T | null
  raw?: unknown
  status?: number
}

type AuthExpiredHandler = () => void

let onAuthExpired: AuthExpiredHandler | null = null
let authExpiredFired = false

/** AuthProvider 注册：token 失效时同步清 UI 态 */
export function setAuthExpiredHandler(handler: AuthExpiredHandler | null) {
  onAuthExpired = handler
  authExpiredFired = false
}

function fireAuthExpired() {
  if (authExpiredFired) return
  authExpiredFired = true
  jwt.clearToken()
  try {
    onAuthExpired?.()
  } finally {
    // 允许下次登录后再次触发
    setTimeout(() => {
      authExpiredFired = false
    }, 1000)
  }
}

export const http = axios.create({
  timeout: 30_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** 为 true 时 401 不触发全局登出（用于 /auth/refresh 自身） */
    skipAuthExpired?: boolean
  }
  export interface InternalAxiosRequestConfig {
    skipAuthExpired?: boolean
  }
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // 先快照 token：isValid() 内部会在过期时清 token，直接读 jwt.token 会漏掉
  // 「存在但已过期」分支，导致本地过期时 fireAuthExpired 永远不触发
  const token = jwt.token
  if (jwt.isValid()) {
    config.headers.Authorization = `Bearer ${token}`
  } else if (token && !config.skipAuthExpired) {
    // token 存在但已过期：清会话（refresh 请求除外）
    fireAuthExpired()
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status
    const cfg = error.config as InternalAxiosRequestConfig | undefined
    // 仅 401 视为会话失效；业务暂无权限执行此操作用 403 + body.message，不应清登录
    // refresh 自身 401 不连环清会话（由 AuthContext 处理）
    if (status === 401 && jwt.token && !cfg?.skipAuthExpired) {
      fireAuthExpired()
    }
    return Promise.reject(error)
  },
)

function isSuccessCode(code: unknown): boolean {
  return code === 0 || code === '0' || code === true
}

export async function request<T = unknown>(
  config: AxiosRequestConfig,
): Promise<ApiResult<T>> {
  try {
    const res = await http.request(config)
    const body = res.data as Record<string, unknown> | null

    if (!body || typeof body !== 'object') {
      return { success: true, message: 'ok', data: res.data as T, raw: res.data, status: res.status }
    }

    // { success, message, data? | rest }
    if ('success' in body) {
      const success = Boolean(body.success)
      const rawMsg = body.message != null ? String(body.message) : success ? 'ok' : UX_REQUEST_FAILED
      const message = success ? rawMsg : sanitizeUserMessage(rawMsg, UX_REQUEST_FAILED)
      if ('data' in body) {
        return { success, message, data: body.data as T, raw: body, status: res.status }
      }
      const { success: _s, message: _m, ...rest } = body
      return {
        success,
        message,
        data: (Object.keys(rest).length ? rest : null) as T | null,
        raw: body,
        status: res.status,
      }
    }

    // { code: 0|"0", data, message?, total? }
    if ('code' in body) {
      const success = isSuccessCode(body.code)
      const rawMsg =
        body.message != null
          ? String(body.message)
          : body.msg != null
            ? String(body.msg)
            : success
              ? 'ok'
              : UX_REQUEST_FAILED
      const message = success ? rawMsg : sanitizeUserMessage(rawMsg, UX_REQUEST_FAILED)
      if ('data' in body) {
        return { success, message, data: body.data as T, raw: body, status: res.status }
      }
      return { success, message, data: body as T, raw: body, status: res.status }
    }

    // bare data object/array
    return {
      success: true,
      message: 'ok',
      data: ('data' in body ? body.data : body) as T,
      raw: body,
      status: res.status,
    }
  } catch (err) {
    const error = err as AxiosError<{
      message?: string
      reason?: string
      code?: number | string
      metadata?: Record<string, string>
    }>
    const status = error.response?.status
    const body = error.response?.data
    // Kratos: { code, reason, message }；网关 404 常只有 HTML/空
    const raw =
      (typeof body?.message === 'string' && body.message) ||
      (typeof body?.reason === 'string' && body.reason) ||
      (status === 404
        ? UX_SERVICE_UNAVAILABLE
        : status === 403
          ? UX_FORBIDDEN
          : error.message) ||
      UX_NETWORK
    const message = sanitizeUserMessage(raw, UX_NETWORK)
    return { success: false, message, data: null, status }
  }
}

export function get<T = unknown>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig,
) {
  return request<T>({ method: 'GET', url, params, ...config })
}

export function post<T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
) {
  return request<T>({ method: 'POST', url, data, ...config })
}

export function del<T = unknown>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig,
) {
  return request<T>({ method: 'DELETE', url, params, ...config })
}

export function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isNaN(n) ? fallback : n
  }
  return fallback
}

export function str(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback
  return String(v)
}

export function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1'
}

/** 统一解析列表响应：兼容 { list, total } / 顶层数组 / data 嵌套 */
export function parseListResponse<T>(
  raw: unknown,
  mapItem: (r: Record<string, unknown>) => T,
): { list: T[]; total: number; page?: number; pageSize?: number } {
  const body = (raw ?? {}) as Record<string, unknown>
  let listRaw: unknown[] = []
  if (Array.isArray(body.list)) listRaw = body.list
  else if (Array.isArray(body.data)) listRaw = body.data
  else if (Array.isArray(raw)) listRaw = raw
  else if (body.data && typeof body.data === 'object') {
    const nested = body.data as Record<string, unknown>
    if (Array.isArray(nested.list)) listRaw = nested.list
  }
  const list = listRaw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map(mapItem)
  const totalSource =
    body.total ??
    (body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>).total
      : undefined)
  const pageSource =
    body.page ??
    (body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>).page
      : undefined)
  const pageSizeSource =
    body.pageSize ??
    (body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>).pageSize
      : undefined)
  return {
    list,
    total: num(totalSource, list.length),
    page: pageSource !== undefined ? num(pageSource) : undefined,
    pageSize: pageSizeSource !== undefined ? num(pageSizeSource) : undefined,
  }
}
