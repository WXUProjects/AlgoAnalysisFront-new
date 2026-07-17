import { useRef } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  animateHoverTransformIn,
  animateHoverTransformOut,
  MOTION,
} from '@/lib/motion'
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
  const iconRef = useRef<SVGSVGElement>(null)
  const label = isDark ? '浅色主题' : '深色主题'

  const icon = isDark ? (
    <SunIcon ref={iconRef} className="will-change-transform" />
  ) : (
    <MoonIcon ref={iconRef} className="will-change-transform" />
  )

  const hoverIn = () => {
    const el = iconRef.current
    if (el) {
      animateHoverTransformIn(el, {
        rotation: isDark ? MOTION.hover.rotate : 0,
        scale: 1.05,
      })
    }
  }
  const hoverOut = () => {
    const el = iconRef.current
    if (el) animateHoverTransformOut(el)
  }
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
        onPointerEnter={hoverIn}
        onPointerLeave={hoverOut}
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
      onPointerEnter={hoverIn}
      onPointerLeave={hoverOut}
    >
      {icon}
      <span>{label}</span>
    </SidebarMenuButton>
  )
}
