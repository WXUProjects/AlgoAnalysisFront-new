import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { OrgInfo, UserProfile } from '@shared/api'
import {
  fetchProfileById,
  login as apiLogin,
  logout as apiLogout,
  refreshToken,
} from '@/api/auth'
import { listMyOrgs, switchOrg as apiSwitchOrg } from '@/api/org'
import {
  captureDomainFromLocation,
  clearDomainHint,
  DOMAIN_HINT_EVENT,
  findOrgByDomainHint,
  getDomainHint,
} from '@/lib/domain-hint'
import { setAuthExpiredHandler } from '@/lib/http'
import { jwt, jwtPayloadEquals, type JwtPayload } from '@/lib/jwt'
import {
  isCaptainFromPayload,
  isCoachFromPayload,
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
  login: (
    username: string,
    password: string,
  ) => Promise<{
    success: boolean
    message: string
    data?: {
      wasDormant?: boolean
      syncStarted?: boolean
      inactiveDays?: number
    } | null
  }>
  logout: () => void
  sync: () => Promise<void>
  /**
   * 切换当前组织。
   * - 默认视为用户手动切换：清除 `?domain=` 持久标记
   * - `fromDomainHint: true`：由域标记自动切换，保留标记
   */
  switchOrg: (
    orgId: number,
    opts?: { fromDomainHint?: boolean },
  ) => Promise<{ success: boolean; message: string }>
  refreshOrgs: () => Promise<OrgInfo[]>
  /** 按本地 domain 标记尝试切域（非成员则保持当前/默认） */
  applyDomainHint: (list?: OrgInfo[]) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/** 剩余有效期低于此值才主动 refresh（秒）；7 天 TTL 下约剩 1 天时续期 */
const RENEW_WHEN_REMAINING_SEC = 24 * 60 * 60
/** 两次主动续期间隔下限，避免 visibility 连点 */
const RENEW_MIN_INTERVAL_MS = 60 * 60 * 1000

function deriveFlags(payload: JwtPayload | null) {
  return {
    isLogin: Boolean(payload),
    isAdmin: isSiteAdminFromPayload(payload),
    isSiteAdmin: isSiteAdminFromPayload(payload),
    isOrgAdmin: isOrgAdminFromPayload(payload),
    isCoach: isCoachFromPayload(payload),
    isCaptain: isCaptainFromPayload(payload),
    isStaff: isStaffFromPayload(payload),
    // 任意登录用户均可走队员侧（资料/交题等）
    isMemberLike: Boolean(payload),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<JwtPayload | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [orgs, setOrgs] = useState<OrgInfo[]>([])
  const [ready, setReady] = useState(false)
  const userRef = useRef<JwtPayload | null>(null)
  const orgsRef = useRef<OrgInfo[]>([])
  const lastRenewAtRef = useRef(0)
  const profileLoadedForRef = useRef<number | null>(null)
  /** 避免 domain hint 自动切域与 sync 重入 */
  const applyingDomainHintRef = useRef(false)

  const setUser = useCallback((next: JwtPayload | null) => {
    if (jwtPayloadEquals(userRef.current, next)) return
    userRef.current = next
    setUserState(next)
  }, [])

  const setOrgsBoth = useCallback((list: OrgInfo[]) => {
    orgsRef.current = list
    setOrgs(list)
  }, [])

  const logout = useCallback(() => {
    void apiLogout()
    jwt.clearToken()
    profileLoadedForRef.current = null
    setUser(null)
    setProfile(null)
    setOrgsBoth([])
  }, [setUser, setOrgsBoth])

  const refreshOrgs = useCallback(async (): Promise<OrgInfo[]> => {
    if (!jwt.isValid()) {
      setOrgsBoth([])
      return []
    }
    const res = await listMyOrgs()
    if (res.success) {
      setOrgsBoth(res.list)
      return res.list
    }
    return orgsRef.current
  }, [setOrgsBoth])

  /**
   * 按 `?domain=` / 本地标记切到目标组织。
   * 非成员：不切换（留在公共域或用户当前默认），标记仍保留以便日后加入后再生效。
   */
  const applyDomainHint = useCallback(
    async (list?: OrgInfo[]) => {
      if (applyingDomainHintRef.current) return
      if (!jwt.isValid()) return
      const hint = getDomainHint()
      if (!hint) return
      const orgsList = list ?? orgsRef.current
      if (!orgsList.length) return

      const target = findOrgByDomainHint(orgsList, hint)
      if (!target) {
        // 不是该域成员 → 回退：保持 JWT 当前组织（公共域/默认），不 toast
        return
      }
      const cur = userRef.current?.orgId
      if (cur && cur === target.id) return

      applyingDomainHintRef.current = true
      try {
        const res = await apiSwitchOrg(target.id)
        if (!res.success) return
        profileLoadedForRef.current = null
        // 切完后刷新会话；fromDomainHint 路径不经 switchOrg 包装，标记保留
        try {
          await refreshToken()
        } catch {
          /* token 已在 apiSwitchOrg 写入 */
        }
        if (!jwt.isValid()) return
        const payload = jwt.getUserInfo()
        if (!payload) return
        setUser(payload)
        const resProf = await fetchProfileById(payload.userId)
        if (resProf.success && resProf.data) {
          setProfile(resProf.data)
          profileLoadedForRef.current = payload.userId
        }
        await refreshOrgs()
      } finally {
        applyingDomainHintRef.current = false
      }
    },
    [refreshOrgs, setUser],
  )

  /**
   * 会话同步：
   * - 内存 token 仍有效：不调 refresh，避免无意义重签 + 全站重渲染
   * - 无内存 token：用 HttpOnly Cookie 调 refresh 一次恢复
   * - profile/orgs 仅在 userId 变化或尚未加载时拉取
   * - 拉完组织后尝试应用 domain 标记
   */
  const sync = useCallback(
    async (opts?: {
      forceRefresh?: boolean
      forceProfile?: boolean
      /** 即使 profile 已缓存也再试 domain 切域 */
      applyHint?: boolean
    }) => {
      const forceRefresh = Boolean(opts?.forceRefresh)
      const forceProfile = Boolean(opts?.forceProfile)
      const applyHint = opts?.applyHint !== false

      if (forceRefresh || !jwt.isValid()) {
        try {
          await refreshToken()
        } catch {
          /* ignore */
        }
      }

      if (!jwt.isValid()) {
        profileLoadedForRef.current = null
        setUser(null)
        setProfile(null)
        setOrgsBoth([])
        return
      }

      const payload = jwt.getUserInfo()
      if (!payload) {
        jwt.clearToken()
        profileLoadedForRef.current = null
        setUser(null)
        setProfile(null)
        setOrgsBoth([])
        return
      }

      setUser(payload)

      const needProfile =
        forceProfile || profileLoadedForRef.current !== payload.userId
      let list: OrgInfo[] = orgsRef.current
      if (needProfile) {
        const res = await fetchProfileById(payload.userId)
        if (res.success && res.data) {
          setProfile(res.data)
          profileLoadedForRef.current = payload.userId
        }
        list = await refreshOrgs()
      } else if (!list.length) {
        list = await refreshOrgs()
      }

      if (applyHint) {
        await applyDomainHint(list)
      }
    },
    [refreshOrgs, setUser, setOrgsBoth, applyDomainHint],
  )

  useEffect(() => {
    setAuthExpiredHandler(() => {
      profileLoadedForRef.current = null
      setUser(null)
      setProfile(null)
      setOrgsBoth([])
    })
    return () => setAuthExpiredHandler(null)
  }, [setUser, setOrgsBoth])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // 首屏就捕获 URL domain，未登录时先落本地，登录后再切
      captureDomainFromLocation()
      await sync()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
    // 仅冷启动一次；勿依赖 sync 引用以免重跑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // URL/本地 domain 标记变化时（登录态）再尝试切域
  useEffect(() => {
    const onHint = () => {
      if (!jwt.isValid()) return
      void applyDomainHint()
    }
    window.addEventListener(DOMAIN_HINT_EVENT, onHint)
    return () => window.removeEventListener(DOMAIN_HINT_EVENT, onHint)
  }, [applyDomainHint])

  // 接近过期时静默续期；成功后幂等 setUser，不重拉整站数据
  useEffect(() => {
    const renewIfNeeded = async () => {
      if (!userRef.current) return
      if (!jwt.isValid()) {
        // 内存过期：尝试 cookie 恢复一次，失败再登出
        try {
          const res = await refreshToken()
          if (res.success && jwt.isValid()) {
            const payload = jwt.getUserInfo()
            if (payload) {
              setUser(payload)
              lastRenewAtRef.current = Date.now()
              return
            }
          }
        } catch {
          /* fallthrough */
        }
        logout()
        return
      }
      const remaining = jwt.remainingSeconds()
      if (remaining > RENEW_WHEN_REMAINING_SEC) return
      const now = Date.now()
      if (now - lastRenewAtRef.current < RENEW_MIN_INTERVAL_MS) return
      lastRenewAtRef.current = now
      try {
        const res = await refreshToken()
        if (!res.success) {
          if (!jwt.isValid()) logout()
          return
        }
        const payload = jwt.getUserInfo()
        if (payload) setUser(payload)
        else if (!jwt.isValid()) logout()
      } catch {
        if (!jwt.isValid()) logout()
      }
    }

    const onVis = () => {
      if (document.visibilityState === 'visible') void renewIfNeeded()
    }
    document.addEventListener('visibilitychange', onVis)
    // 长开标签：每小时检查是否需要续期（实际仅剩 <1 天才打 refresh）
    const t = window.setInterval(() => void renewIfNeeded(), 60 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(t)
    }
  }, [logout, setUser])

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await apiLogin(username, password)
      if (res.success) {
        profileLoadedForRef.current = null
        // 登录后按 domain 标记切域（未登录时访问 ?domain= 已写入本地）
        await sync({ forceRefresh: false, forceProfile: true, applyHint: true })
      }
      return {
        success: res.success,
        message: res.message,
        data: res.data
          ? {
              wasDormant: res.data.wasDormant,
              syncStarted: res.data.syncStarted,
              inactiveDays: res.data.inactiveDays,
            }
          : null,
      }
    },
    [sync],
  )

  const switchOrg = useCallback(
    async (orgId: number, opts?: { fromDomainHint?: boolean }) => {
      const res = await apiSwitchOrg(orgId)
      if (res.success) {
        // 用户手动切域 → 结束 domain 标记；自动切域则保留
        if (!opts?.fromDomainHint) {
          clearDomainHint()
        }
        // 切组织会重签 JWT；applyHint=false 避免与手动切换打架
        profileLoadedForRef.current = null
        await sync({
          forceRefresh: false,
          forceProfile: true,
          applyHint: false,
        })
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
      applyDomainHint,
    }),
    [
      flags,
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
      applyDomainHint,
    ],
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
