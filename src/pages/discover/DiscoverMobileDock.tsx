import {
  CalendarIcon,
  ChartLineIcon,
  CompassIcon,
  FlameIcon,
  TrophyIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DISCOVER_MOBILE_VIEW_LABEL,
  type DiscoverMobileView,
} from './mobile-view'

const DOCK_ITEMS: {
  key: DiscoverMobileView
  icon: typeof CompassIcon
}[] = [
  { key: 'feed', icon: CompassIcon },
  { key: 'data', icon: ChartLineIcon },
  { key: 'hot', icon: FlameIcon },
  { key: 'rank', icon: TrophyIcon },
  { key: 'contest', icon: CalendarIcon },
]

type Props = {
  view: DiscoverMobileView
  onViewChange: (view: DiscoverMobileView) => void
}

/**
 * 发现页移动端底部导航：切换全屏子页（非 Sheet）。
 * 发现 / 数据 / 热题 / 排行 / 赛事
 */
export function DiscoverMobileDock({ view, onViewChange }: Props) {
  return (
    <>
      <div
        aria-hidden
        className="h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:hidden"
      />

      <nav
        data-discover-mobile-dock=""
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto flex h-14 max-w-lg items-stretch px-1">
          {DOCK_ITEMS.map(({ key, icon: Icon }) => {
            const active = view === key
            const label = DISCOVER_MOBILE_VIEW_LABEL[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => onViewChange(key)}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground active:bg-muted/60',
                )}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
              >
                <Icon
                  className={cn(
                    'size-5',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                />
                <span className={cn(active && 'font-medium')}>{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
