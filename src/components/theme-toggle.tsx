import { useEffect, useState } from 'react'
import {
  CheckIcon,
  LaptopIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { useAppearance } from '@/hooks/use-appearance'
import {
  COLOR_SCHEME_OPTIONS,
  colorSchemeControlLabel,
  colorSchemeCycleHint,
  colorSchemeLabel,
  nextColorScheme,
  type ColorSchemeMode,
} from '@/lib/color-scheme'
import { cn } from '@/lib/utils'

type ThemeToggleProps = {
  /**
   * `sidebar` — SidebarMenuButton + 下拉（主站侧栏）
   * `button` — 图标按钮 + 下拉（顶栏 / 简约博客）
   * `cycle` — 单击轮换 浅色→深色→跟随系统（Chirpy / Mizuki 紧凑按钮）
   */
  variant?: 'sidebar' | 'button' | 'cycle'
  /** Extra classes on the trigger (blog shell icon buttons). */
  className?: string
}

function ModeIcon({
  mode,
  className,
}: {
  mode: ColorSchemeMode
  className?: string
}) {
  if (mode === 'dark') return <MoonIcon className={className} />
  if (mode === 'system') return <LaptopIcon className={className} />
  return <SunIcon className={className} />
}

/**
 * 外观切换：浅色 / 深色 / 跟随系统（自适应）。
 * 博客页在 BlogColorSchemeProvider 内时写入该博访客偏好；主站写 next-themes。
 */
export function ThemeToggle({
  variant = 'sidebar',
  className,
}: ThemeToggleProps) {
  const { theme, setTheme } = useAppearance()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const mode = theme
  const label = colorSchemeControlLabel(mode)
  const cycleHint = colorSchemeCycleHint(mode)

  if (variant === 'cycle') {
    return (
      <button
        type="button"
        className={className}
        aria-label={label}
        title={cycleHint}
        disabled={!mounted}
        onClick={() => setTheme(nextColorScheme(mode))}
      >
        {mounted ? (
          <ModeIcon mode={mode} className="size-4" />
        ) : (
          <LaptopIcon className="size-4" />
        )}
      </button>
    )
  }

  const menu = (
    <DropdownMenuContent align="end" className="min-w-40">
      {COLOR_SCHEME_OPTIONS.map((opt) => {
        const active = mode === opt.id
        return (
          <DropdownMenuItem
            key={opt.id}
            onClick={() => setTheme(opt.id)}
            className="gap-2"
          >
            <ModeIcon mode={opt.id} />
            <span className="flex-1">{opt.label}</span>
            {active ? (
              <CheckIcon className="size-3.5 text-primary" />
            ) : null}
          </DropdownMenuItem>
        )
      })}
    </DropdownMenuContent>
  )

  if (variant === 'button') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            title={label}
            className={className}
            disabled={!mounted}
          >
            {mounted ? <ModeIcon mode={mode} /> : <LaptopIcon />}
          </Button>
        </DropdownMenuTrigger>
        {menu}
      </DropdownMenu>
    )
  }

  // sidebar
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          type="button"
          tooltip={label}
          className={className}
          disabled={!mounted}
        >
          {mounted ? <ModeIcon mode={mode} /> : <LaptopIcon />}
          <span>{mounted ? colorSchemeLabel(mode) : '外观'}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      {menu}
    </DropdownMenu>
  )
}

/** Compact status row for mobile “更多” sheet — cycles all three modes. */
export function ThemeModeStatus({ className }: { className?: string }) {
  const { theme, setTheme } = useAppearance()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const mode = theme
  const label = colorSchemeControlLabel(mode)

  return (
    <button
      type="button"
      onClick={() => setTheme(nextColorScheme(mode))}
      disabled={!mounted}
      className={cn(className)}
      aria-label={label}
      title={colorSchemeCycleHint(mode)}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/50">
        {mounted ? (
          <ModeIcon mode={mode} className="size-4" />
        ) : (
          <LaptopIcon className="size-4" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left font-medium">外观</span>
      <span className="text-xs text-muted-foreground">
        {mounted ? colorSchemeLabel(mode) : '…'}
      </span>
    </button>
  )
}
