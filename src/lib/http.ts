import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import { jwt } from '@/lib/jwt'

export interface ApiResult<T = unknown> {
  success: boolean
  message: string
  data: T | null
  raw?: unknown
}

export const http = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config) => {
  if (jwt.isValid()) {
    config.headers.Authorization = `Bearer ${jwt.token}`
  }
  return config
})

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
      return { success: true, message: 'ok', data: res.data as T, raw: res.data }
    }

    // { success, message, data? | rest }
    if ('success' in body) {
      const success = Boolean(body.success)
      const message = String(body.message ?? (success ? 'ok' : '请求失败'))
      if ('data' in body) {
        return { success, message, data: body.data as T, raw: body }
      }
      const { success: _s, message: _m, ...rest } = body
      return {
        success,
        message,
        data: (Object.keys(rest).length ? rest : null) as T | null,
        raw: body,
      }
    }

    // { code: 0|"0", data, message?, total? }
    if ('code' in body) {
      const success = isSuccessCode(body.code)
      const message = String(body.message ?? body.msg ?? (success ? 'ok' : '请求失败'))
      if ('data' in body) {
        // keep total/page for list callers via raw
        return { success, message, data: body.data as T, raw: body }
      }
      return { success, message, data: body as T, raw: body }
    }

    // bare data object/array
    return {
      success: true,
      message: 'ok',
      data: ('data' in body ? body.data : body) as T,
      raw: body,
    }
  } catch (err) {
    const error = err as AxiosError<{ message?: string }>
    const message =
      error.response?.data?.message ||
      error.message ||
      '网络错误，请稍后重试'
    return { success: false, message, data: null }
  }
}

export function get<T = unknown>(url: string, params?: Record<string, unknown>) {
  return request<T>({ method: 'GET', url, params })
}

export function post<T = unknown>(url: string, data?: unknown) {
  return request<T>({ method: 'POST', url, data })
}

export function del<T = unknown>(url: string, params?: Record<string, unknown>) {
  return request<T>({ method: 'DELETE', url, params })
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
