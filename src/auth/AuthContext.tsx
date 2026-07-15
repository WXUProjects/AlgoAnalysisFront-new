import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { OrgInfo, UserProfile } from '@shared/api'
import { fetchProfileById, login as apiLogin, refreshToken } from '@/api/auth'
import { listMyOrgs, switchOrg as apiSwitchOrg } from '@/api/org'
import { setAuthExpiredHandler } from '@/lib/http'
import { jwt, type JwtPayload } from '@/lib/jwt'
import {
  isCaptainFromPayload,
  isCoachFromPayload,
  isMemberLikeRole,
  isOrgAdminFromPayload,
  isSiteAdminFromPayload,
  isStaffFromPayload,
} from '@/lib/roles'

interface AuthState {
  isLogin: boolean
  /** 站点管理员 */
  isAdmin: boolean
  isSiteAdmin: boolean
  /** 当前组织管理员 */
  isOrgAdmin: boolean
  /** 兼容：旧纯教练 */
  isCoach: boolean
  isCaptain: boolean
  /** 管理端入口：站点管理员或组织管理员 */
  isStaff: boolean
  isMemberLike: boolean
  user: JwtPayload | null
  profile: UserProfile | null
  orgs: OrgInfo[]
  currentOrg: OrgInfo | null
  ready: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  sync: () => Promise<void>
  switchOrg: (orgId: number) => Promise<{ success: boolean; message: string }>
  refreshOrgs: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

function deriveFlags(payload: JwtPayload | null) {
  return {
    isLogin: Boolean(payload),
    isAdmin: isSiteAdminFromPayload(payload),
    isSiteAdmin: isSiteAdminFromPayload(payload),
    isOrgAdmin: isOrgAdminFromPayload(payload),
    isCoach: isCoachFromPayload(payload),
    isCaptain: isCaptainFromPayload(payload),
    isStaff: isStaffFromPayload(payload),
    isMemberLike: isMemberLikeRole(payload?.roleId) || Boolean(payload),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [orgs, setOrgs] = useState<OrgInfo[]>([])
  const [ready, setReady] = useState(false)

  const logout = useCallback(() => {
    jwt.clearToken()
    setUser(null)
    setProfile(null)
    setOrgs([])
  }, [])

  const refreshOrgs = useCallback(async () => {
    if (!jwt.isValid()) {
      setOrgs([])
      return
    }
    const res = await listMyOrgs()
    if (res.success) setOrgs(res.list)
  }, [])

  const sync = useCallback(async () => {
    if (!jwt.isValid()) {
      setUser(null)
      setProfile(null)
      setOrgs([])
      return
    }

    // 启动/刷新时重签 JWT（后端未部署时静默跳过）
    try {
      await refreshToken()
    } catch {
      /* ignore */
    }

    if (!jwt.isValid()) {
      setUser(null)
      setProfile(null)
      setOrgs([])
      return
    }

    const payload = jwt.getUserInfo()
    if (!payload) {
      jwt.clearToken()
      setUser(null)
      setProfile(null)
      setOrgs([])
      return
    }

    setUser(payload)

    const res = await fetchProfileById(payload.userId)
    if (res.success && res.data) {
      setProfile(res.data)
    }
    await refreshOrgs()
  }, [refreshOrgs])

  useEffect(() => {
    setAuthExpiredHandler(() => {
      setUser(null)
      setProfile(null)
      setOrgs([])
    })
    return () => setAuthExpiredHandler(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await sync()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [sync])

  // 有效期内活跃则重签 JWT（滑动 30 天）；过期则登出
  useEffect(() => {
    let lastRenewAt = 0
    const RENEW_MIN_INTERVAL_MS = 60 * 60 * 1000 // 续期最多每小时一次

    const renewIfNeeded = async () => {
      if (!user) return
      if (!jwt.isValid()) {
        logout()
        return
      }
      const now = Date.now()
      if (now - lastRenewAt < RENEW_MIN_INTERVAL_MS) return
      lastRenewAt = now
      try {
        await refreshToken()
        const payload = jwt.getUserInfo()
        if (payload) setUser(payload)
        else logout()
      } catch {
        if (!jwt.isValid()) logout()
      }
    }

    const onVis = () => {
      if (document.visibilityState === 'visible') void renewIfNeeded()
    }
    document.addEventListener('visibilitychange', onVis)
    // 长开标签页：每小时续期
    const t = window.setInterval(() => void renewIfNeeded(), 60 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(t)
    }
  }, [user, logout])

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await apiLogin(username, password)
      if (res.success) {
        await sync()
      }
      return { success: res.success, message: res.message }
    },
    [sync],
  )

  const switchOrg = useCallback(
    async (orgId: number) => {
      const res = await apiSwitchOrg(orgId)
      if (res.success) {
        await sync()
      }
      return { success: res.success, message: res.message }
    },
    [sync],
  )

  const flags = deriveFlags(user)
  const currentOrg = useMemo(() => {
    if (!user?.orgId) return orgs.find((o) => o.isCurrent) || orgs[0] || null
    return orgs.find((o) => o.id === user.orgId) || orgs.find((o) => o.isCurrent) || null
  }, [user, orgs])

  const value = useMemo<AuthState>(
    () => ({
      ...flags,
      user,
      profile,
      orgs,
      currentOrg,
      ready,
      login,
      logout,
      sync,
      switchOrg,
      refreshOrgs,
    }),
    [flags, user, profile, orgs, currentOrg, ready, login, logout, sync, switchOrg, refreshOrgs],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
