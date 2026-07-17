import { useRef } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  animateHoverTransformIn,
  animateHoverTransformOut,
  MOTION,
} from '@/lib/motion'
import { SidebarMenuButton } from '@/components/ui/sidebar'

/** 侧栏主题切换：与 SidebarMenuButton 对齐，折叠图标模式不溢出 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const iconRef = useRef<SVGSVGElement>(null)

  return (
    <SidebarMenuButton
      type="button"
      tooltip={isDark ? '浅色主题' : '深色主题'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      onPointerEnter={() => {
        const el = iconRef.current
        if (el) {
          animateHoverTransformIn(el, {
            rotation: isDark ? MOTION.hover.rotate : 0,
            scale: 1.05,
          })
        }
      }}
      onPointerLeave={() => {
        const el = iconRef.current
        if (el) animateHoverTransformOut(el)
      }}
    >
      {isDark ? (
        <SunIcon ref={iconRef} className="will-change-transform" />
      ) : (
        <MoonIcon ref={iconRef} className="will-change-transform" />
      )}
      <span>{isDark ? '浅色主题' : '深色主题'}</span>
    </SidebarMenuButton>
  )
}
