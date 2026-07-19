/** 组织邀请识别码：URL / 本地缓存，注册与登录流程共用 */

const STORAGE_KEY = 'goalgo_org_invite_code'

export function buildOrgInvitePath(code: string): string {
  return `/join?code=${encodeURIComponent(code.trim())}`
}

export function buildOrgInviteUrl(code: string): string {
  if (typeof window === 'undefined') return buildOrgInvitePath(code)
  return `${window.location.origin}${buildOrgInvitePath(code)}`
}

export function rememberInviteCode(code: string | null | undefined) {
  const c = (code || '').trim()
  if (!c) return
  try {
    sessionStorage.setItem(STORAGE_KEY, c)
  } catch {
    /* ignore quota / private mode */
  }
}

export function peekInviteCode(): string {
  try {
    return (sessionStorage.getItem(STORAGE_KEY) || '').trim()
  } catch {
    return ''
  }
}

export function takeInviteCode(): string {
  const c = peekInviteCode()
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  return c
}

export function clearInviteCode() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
