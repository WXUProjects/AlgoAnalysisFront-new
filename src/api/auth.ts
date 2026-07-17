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
import { jwt } from '@/lib/jwt'
import { hashPassword } from '@/lib/hash'
import { getProfileById } from '@/api/profile'
import { sanitizeUserMessage } from '@/lib/ux-copy'

function errMessage(err: unknown, fallback: string): string {
  const raw =
    (err as { response?: { data?: { message?: string } }; message?: string })
      .response?.data?.message ||
    (err as { message?: string }).message ||
    fallback
  return sanitizeUserMessage(raw, fallback)
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
    const res = await http.post<LoginRes & Record<string, unknown>>(
      endpoints.user.auth.login,
      body,
    )
    const data = res.data
    if (data?.success && data.jwtToken) {
      jwt.setNewToken(data.jwtToken)
      // 兼容 wasDormant / was_dormant
      const wasDormant = Boolean(
        data.wasDormant ?? (data as { was_dormant?: boolean }).was_dormant,
      )
      const syncStarted = Boolean(
        data.syncStarted ?? (data as { sync_started?: boolean }).sync_started,
      )
      const inactiveDaysRaw =
        data.inactiveDays ?? (data as { inactive_days?: number }).inactive_days
      const inactiveDays =
        typeof inactiveDaysRaw === 'number' && Number.isFinite(inactiveDaysRaw)
          ? Math.max(0, Math.floor(inactiveDaysRaw))
          : undefined
      const normalized: LoginRes = {
        ...data,
        wasDormant,
        syncStarted,
        inactiveDays,
      }
      return {
        success: true,
        message: data.message || '登录成功',
        data: normalized,
      }
    }
    return {
      success: false,
      message: data?.message || '登录失败，请检查账号密码后重试',
      data: null,
    }
  } catch (err) {
    return { success: false, message: errMessage(err, '登录失败，请检查账号密码后重试'), data: null }
  }
}

export async function sendCode(
  email: string,
  purpose: SendCodeReq['purpose'],
): Promise<ApiResult<SendCodeRes>> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: '请输入有效邮箱', data: null }
  }
  const body: SendCodeReq = {
    email: email.trim(),
    purpose: purpose || 'register',
  }
  try {
    const res = await http.post<SendCodeRes>(endpoints.user.auth.sendCode, body)
    const data = res.data
    return {
      success: Boolean(data?.success),
      message: data?.message || (data?.success ? '验证码已发送' : '发送失败，请稍后重试'),
      data: data ?? null,
    }
  } catch (err) {
    return { success: false, message: errMessage(err, '发送失败，请稍后重试'), data: null }
  }
}

/** 与后端一致：3–64 位字母、数字、下划线或短横线（不含中文与其它符号） */
export const USERNAME_RE = /^[A-Za-z0-9_-]{3,64}$/
export const USERNAME_HINT =
  '3–64 位，仅英文字母、数字、下划线或短横线，不能含中文或特殊符号'

export function validateUsername(username: string): string | null {
  const u = username.trim()
  if (!u) return '请填写账号'
  if (!USERNAME_RE.test(u)) return USERNAME_HINT
  return null
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

  const usernameErr = validateUsername(input.username)
  if (usernameErr) {
    return { success: false, message: usernameErr, data: null }
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
      message: data?.message || (data?.success ? '注册成功' : '注册失败，请稍后重试'),
      data: data ?? null,
    }
  } catch (err) {
    return { success: false, message: errMessage(err, '注册失败，请稍后重试'), data: null }
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
      message: data?.message || (data?.success ? '密码已更新' : '修改失败，请稍后重试'),
      data: data ?? null,
    }
  } catch (err) {
    return { success: false, message: errMessage(err, '修改失败，请稍后重试'), data: null }
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
        data?.message || (data?.success ? '密码已重置' : '密码重置失败，请稍后重试'),
      data: data ?? null,
    }
  } catch (err) {
    return { success: false, message: errMessage(err, '密码重置失败，请稍后重试'), data: null }
  }
}

export async function fetchProfileById(
  userId: number,
): Promise<ApiResult<UserProfile>> {
  // 与 getProfileById 一致：规范化 protobuf 数字字符串等字段
  return getProfileById(userId)
}

/** 用当前登录态换新令牌（角色变更后刷新，权限才能同步到界面） */
export async function refreshToken(): Promise<ApiResult<LoginRes>> {
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
      message: data?.message || '刷新失败，请稍后重试',
      data: null,
    }
  } catch (err) {
    return { success: false, message: errMessage(err, '刷新失败，请稍后重试'), data: null }
  }
}

export async function logout(): Promise<void> {
  try {
    await http.post(endpoints.user.auth.logout, {})
  } finally {
    jwt.clearToken()
  }
}
