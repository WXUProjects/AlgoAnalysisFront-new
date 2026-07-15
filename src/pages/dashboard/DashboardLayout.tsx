import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/utils'
import { PageShell } from '@/components/page-shell'

const links = [
  { to: '/dashboard/statistics', label: '数据统计' },
  { to: '/dashboard/bulletin', label: '公告管理' },
  { to: '/dashboard/problem-progress', label: '题库识别' },
  { to: '/dashboard/group', label: '组管理' },
]

export function DashboardLayout() {
  const { isAdmin, isCoach } = useAuth()
  const userLabel = isAdmin ? '用户管理' : isCoach ? '队员管理' : '用户'

  return (
    <PageShell className="gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">
          {isAdmin ? '后台管理' : '教练管理'}
        </h2>
        <p className="text-sm text-muted-foreground">
          统计 · 公告 · 题库流水线 · 分组 · {userLabel}
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b pb-2">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            {l.label}
          </NavLink>
        ))}
        <NavLink
          to="/dashboard/user"
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          {userLabel}
        </NavLink>
      </nav>
      <Outlet />
    </PageShell>
  )
}
