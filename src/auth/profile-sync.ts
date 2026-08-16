interface ProfileResult<T> {
  success: boolean
  message?: string
  data?: T | null
}

export function requireProfileResult<T>(result: ProfileResult<T>): T {
  if (!result.success) {
    throw new Error(result.message || '资料刷新失败')
  }
  if (!result.data) {
    throw new Error('资料刷新失败')
  }
  return result.data
}
