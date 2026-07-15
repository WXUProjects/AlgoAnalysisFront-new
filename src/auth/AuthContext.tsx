import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { UserProfile } from '@shared/api'
import { fetchProfileById, login as apiLogin } from '@/api/auth'
import { jwt, type JwtPayload } from '@/lib/jwt'
import {
  isAdminRole,
  isCaptainRole,
  isCoachOnlyRole,
  isMemberLikeRole,
  isStaffRole,
} from '@/lib/roles'

interface AuthState {
  isLogin: boolean
  /** 管理员：全部功能 */
  isAdmin: boolean
  /** 纯教练：管理端，无队员资料流程 */
  isCoach: boolean
  /** 队长：教练管理 + 队员交题/资料 */
  isCaptain: boolean
  /** 管理端入口（管理员 / 教练 / 队长） */
  isStaff: boolean
  /** 队员侧（资料/交题）：队员 / 队长 / 管理员 */
  isMemberLike: boolean
  user: JwtPayload | null
  profile: UserProfile | null
  ready: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  sync: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

function deriveFlags(payload: JwtPayload | null) {
  const roleId = payload?.roleId
  return {
    isLogin: Boolean(payload),
    isAdmin: isAdminRole(roleId),
    isCoach: isCoachOnlyRole(roleId),
    isCaptain: isCaptainRole(roleId),
    isStaff: isStaffRole(roleId),
    isMemberLike: isMemberLikeRole(roleId),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [ready, setReady] = useState(false)

  const sync = useCallback(async () => {
    if (!jwt.isValid()) {
      setUser(null)
      setProfile(null)
      return
    }

    const payload = jwt.getUserInfo()
    if (!payload || payload.roleId === undefined) {
      jwt.clearToken()
      setUser(null)
      setProfile(null)
      return
    }

    setUser(payload)

    const res = await fetchProfileById(payload.userId)
    if (res.success && res.data) {
      setProfile(res.data)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await sync()
      setReady(true)
    })()
  }, [sync])

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

  const logout = useCallback(() => {
    jwt.clearToken()
    setUser(null)
    setProfile(null)
  }, [])

  const { isLogin, isAdmin, isCoach, isCaptain, isStaff, isMemberLike } =
    deriveFlags(user)

  const value = useMemo<AuthState>(
    () => ({
      isLogin,
      isAdmin,
      isCoach,
      isCaptain,
      isStaff,
      isMemberLike,
      user,
      profile,
      ready,
      login,
      logout,
      sync,
    }),
    [
      isLogin,
      isAdmin,
      isCoach,
      isCaptain,
      isStaff,
      isMemberLike,
      user,
      profile,
      ready,
      login,
      logout,
      sync,
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
