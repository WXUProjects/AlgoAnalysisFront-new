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

interface AuthState {
  isLogin: boolean
  isAdmin: boolean
  isCoach: boolean
  user: JwtPayload | null
  profile: UserProfile | null
  ready: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  sync: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

function deriveFlags(payload: JwtPayload | null) {
  return {
    isLogin: Boolean(payload),
    isAdmin: payload?.roleId === 1,
    isCoach: payload?.roleId === 2,
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

  const { isLogin, isAdmin, isCoach } = deriveFlags(user)

  const value = useMemo<AuthState>(
    () => ({
      isLogin,
      isAdmin,
      isCoach,
      user,
      profile,
      ready,
      login,
      logout,
      sync,
    }),
    [isLogin, isAdmin, isCoach, user, profile, ready, login, logout, sync],
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
