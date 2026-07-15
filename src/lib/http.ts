import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { jwt } from '@/lib/jwt'

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
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (jwt.isValid()) {
    config.headers.Authorization = `Bearer ${jwt.token}`
  } else if (jwt.token) {
    // token 存在但已过期：清会话
    fireAuthExpired()
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status
    if (status === 401 || status === 403) {
      // 仅在曾带 token 时视为会话失效（公开接口 403 不强制登出）
      if (jwt.token) {
        fireAuthExpired()
      }
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
      const message = String(body.message ?? (success ? 'ok' : '请求失败'))
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
      const message = String(body.message ?? body.msg ?? (success ? 'ok' : '请求失败'))
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
    const error = err as AxiosError<{ message?: string }>
    const status = error.response?.status
    const message =
      error.response?.data?.message ||
      error.message ||
      '网络错误，请稍后重试'
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
