import {
  endpoints,
  type LoginReq,
  type LoginRes,
  type RegisterReq,
  type RegisterRes,
  type ResetPasswordReq,
  type ResetPasswordRes,
  type SendCodeReq,
  type SendCodeRes,
  type UserProfile,
} from '@shared/api'
import { http, type ApiResult } from '@/lib/http'
import { get } from '@/lib/http'
import { jwt } from '@/lib/jwt'
import { hashPassword } from '@/lib/hash'

function errMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } }; message?: string })
      .response?.data?.message ||
    (err as { message?: string }).message ||
    fallback
  )
}

export async function login(
  username: string,
  password: string,
): Promise<ApiResult<LoginRes>> {
  // 已有有效 token 时先清掉，允许重新登录，避免「用户已登录」死锁
  if (jwt.isValid()) {
    jwt.clearToken()
  }

  const body: LoginReq = {
    username: username.trim(),
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
    return { success: false, message: errMessage(err, '登录失败'), data: null }
  }
}

export async function sendCode(
  email: string,
  purpose: SendCodeReq['purpose'],
): Promise<ApiResult<SendCodeRes>> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: '请输入有效邮箱', data: null }
  }
  const body: SendCodeReq = { email: email.trim(), purpose }
  try {
    const res = await http.post<SendCodeRes>(endpoints.user.auth.sendCode, body)
    const data = res.data
    return {
      success: Boolean(data?.success),
      message: data?.message || (data?.success ? '验证码已发送' : '发送失败'),
      data: data ?? null,
    }
  } catch (err) {
    return { success: false, message: errMessage(err, '发送失败'), data: null }
  }
}

export async function register(input: {
  username: string
  password: string
  passwordConfirm: string
  name: string
  email: string
  code: string
}): Promise<ApiResult<RegisterRes>> {
  // 注册前清掉残留 token，避免半登录态干扰
  if (jwt.isValid()) {
    jwt.clearToken()
  }

  if (
    !input.username ||
    !input.password ||
    !input.name ||
    !input.email ||
    !input.code
  ) {
    return { success: false, message: '请填写所有必填项', data: null }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return { success: false, message: '请输入有效邮箱', data: null }
  }

  if (input.password !== input.passwordConfirm) {
    return { success: false, message: '密码不一致', data: null }
  }

  const body: RegisterReq = {
    username: input.username.trim(),
    password: hashPassword(input.password),
    name: input.name.trim(),
    email: input.email.trim(),
    groupId: 0,
    code: input.code.trim(),
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
    return { success: false, message: errMessage(err, '注册失败'), data: null }
  }
}

export async function changePassword(input: {
  oldPassword: string
  newPassword: string
  newPasswordConfirm: string
}): Promise<ApiResult<{ success: boolean; message: string }>> {
  if (!input.oldPassword || !input.newPassword) {
    return { success: false, message: '请填写当前密码和新密码', data: null }
  }
  if (input.newPassword !== input.newPasswordConfirm) {
    return { success: false, message: '两次输入的新密码不一致', data: null }
  }
  if (input.oldPassword === input.newPassword) {
    return { success: false, message: '新密码不能与当前密码相同', data: null }
  }
  try {
    const res = await http.post<{ success: boolean; message: string }>(
      endpoints.user.auth.changePassword,
      {
        oldPassword: hashPassword(input.oldPassword),
        newPassword: hashPassword(input.newPassword),
      },
    )
    const data = res.data
    return {
      success: Boolean(data?.success),
      message: data?.message || (data?.success ? '密码已更新' : '修改失败'),
      data: data ?? null,
    }
  } catch (err) {
    return { success: false, message: errMessage(err, '修改失败'), data: null }
  }
}

export async function resetPassword(input: {
  email: string
  code: string
  password: string
  passwordConfirm: string
}): Promise<ApiResult<ResetPasswordRes>> {
  if (!input.email || !input.code || !input.password) {
    return { success: false, message: '请填写所有必填项', data: null }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return { success: false, message: '请输入有效邮箱', data: null }
  }
  if (input.password !== input.passwordConfirm) {
    return { success: false, message: '密码不一致', data: null }
  }

  const body: ResetPasswordReq = {
    email: input.email.trim(),
    code: input.code.trim(),
    password: hashPassword(input.password),
  }

  try {
    const res = await http.post<ResetPasswordRes>(
      endpoints.user.auth.resetPassword,
      body,
    )
    const data = res.data
    return {
      success: Boolean(data?.success),
      message:
        data?.message || (data?.success ? '密码已重置' : '重置失败'),
      data: data ?? null,
    }
  } catch (err) {
    return { success: false, message: errMessage(err, '重置失败'), data: null }
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
    return { success: false, message: errMessage(err, '刷新失败'), data: null }
  }
}
