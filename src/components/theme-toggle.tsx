import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { SidebarMenuButton } from '@/components/ui/sidebar'

type ThemeToggleProps = {
  /**
   * `sidebar` — SidebarMenuButton（须在 SidebarProvider 内，App/Admin 侧栏）
   * `button` — 普通图标按钮（顶栏 / 博客壳等无侧栏场景）
   */
  variant?: 'sidebar' | 'button'
}

/** 主题切换：侧栏用 SidebarMenuButton，其它布局用图标 Button */
export function ThemeToggle({ variant = 'sidebar' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const label = isDark ? '浅色主题' : '深色主题'

  const icon = isDark ? (
    <SunIcon />
  ) : (
    <MoonIcon />
  )

  const toggle = () => setTheme(isDark ? 'light' : 'dark')

  if (variant === 'button') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        title={label}
        onClick={toggle}
      >
        {icon}
      </Button>
    )
  }

  return (
    <SidebarMenuButton
      type="button"
      tooltip={label}
      onClick={toggle}
    >
      {icon}
      <span>{label}</span>
    </SidebarMenuButton>
  )
}
