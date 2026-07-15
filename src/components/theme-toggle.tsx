import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full justify-start"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <SunIcon
          data-icon="inline-start"
          className="transition-transform duration-300 ease-out group-hover:rotate-45"
        />
      ) : (
        <MoonIcon
          data-icon="inline-start"
          className="transition-transform duration-300 ease-out"
        />
      )}
      {isDark ? '浅色主题' : '深色主题'}
    </Button>
  )
}
