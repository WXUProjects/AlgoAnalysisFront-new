import {
  endpoints,
  type LoginReq,
  type LoginRes,
  type RegisterReq,
  type RegisterRes,
  type UserProfile,
} from '@shared/api'
import { http, type ApiResult } from '@/lib/http'
import { get } from '@/lib/http'
import { jwt } from '@/lib/jwt'
import { hashPassword } from '@/lib/hash'

export async function login(
  username: string,
  password: string,
): Promise<ApiResult<LoginRes>> {
  // 已有有效 token 时先清掉，允许重新登录，避免「用户已登录」死锁
  if (jwt.isValid()) {
    jwt.clearToken()
  }

  const body: LoginReq = {
    username,
    password: hashPassword(password),
  }

  try {
    const res = await http.post<LoginRes>(endpoints.user.auth.login, body)
    const data = res.data
    if (data?.success && data.jwtToken) {
      jwt.setNewToken(data.jwtToken)
      return {
        success: true,
        message: data.message || '登录成功',
        data,
      }
    }
    return {
      success: false,
      message: data?.message || '登录失败',
      data: null,
    }
  } catch (err) {
    const message =
      (err as { response?: { data?: { message?: string } }; message?: string })
        .response?.data?.message ||
      (err as { message?: string }).message ||
      '登录失败'
    return { success: false, message, data: null }
  }
}

export async function register(input: {
  username: string
  password: string
  passwordConfirm: string
  name: string
  email: string
}): Promise<ApiResult<RegisterRes>> {
  // 注册前清掉残留 token，避免半登录态干扰
  if (jwt.isValid()) {
    jwt.clearToken()
  }

  if (!input.username || !input.password || !input.name || !input.email) {
    return { success: false, message: '请填写所有必填项', data: null }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return { success: false, message: '请输入有效邮箱', data: null }
  }

  if (input.password !== input.passwordConfirm) {
    return { success: false, message: '密码不一致', data: null }
  }

  const body: RegisterReq = {
    username: input.username,
    password: hashPassword(input.password),
    name: input.name,
    email: input.email,
    groupId: 0,
  }

  try {
    const res = await http.post<RegisterRes>(endpoints.user.auth.register, body)
    const data = res.data
    return {
      success: Boolean(data?.success),
      message: data?.message || (data?.success ? '注册成功' : '注册失败'),
      data: data ?? null,
    }
  } catch (err) {
    const message =
      (err as { response?: { data?: { message?: string } }; message?: string })
        .response?.data?.message ||
      (err as { message?: string }).message ||
      '注册失败'
    return { success: false, message, data: null }
  }
}

export async function fetchProfileById(
  userId: number,
): Promise<ApiResult<UserProfile>> {
  return get<UserProfile>(endpoints.user.profile.getById, { userId })
}

/** 根据当前登录态重签 JWT（任命后刷新页面可同步权限） */
export async function refreshToken(): Promise<ApiResult<LoginRes>> {
  if (!jwt.isValid()) {
    return { success: false, message: '未登录', data: null }
  }
  try {
    const res = await http.post<LoginRes>(endpoints.user.auth.refresh, {})
    const data = res.data
    if (data?.success && data.jwtToken) {
      jwt.setNewToken(data.jwtToken)
      return {
        success: true,
        message: data.message || '已刷新',
        data,
      }
    }
    return {
      success: false,
      message: data?.message || '刷新失败',
      data: null,
    }
  } catch (err) {
    const message =
      (err as { response?: { data?: { message?: string } }; message?: string })
        .response?.data?.message ||
      (err as { message?: string }).message ||
      '刷新失败'
    return { success: false, message, data: null }
  }
}
