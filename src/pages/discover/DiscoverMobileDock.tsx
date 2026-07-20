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
 *
 * 通过 Portal 渲染到 document.body，
 * 逃出 GsapPageTransition 的 transform 上下文，
 * 确保 position: fixed 相对视口定位，
 * 底栏始终可见、可点击、不被遮挡。
 *
 * 占位 spacer 由父组件 Discover.tsx 在页面流中提供。
 */
export function DiscoverMobileDock({ view, onViewChange }: Props) {
  return (
    <nav
      data-discover-mobile-dock=""
      aria-label="发现页导航"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40',
        'border-t bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80',
        'lg:hidden',
        'touch-manipulation',
      )}
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
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md',
                'text-[10px] transition-colors',
                'min-h-[44px]',
                active
                  ? 'text-foreground font-medium'
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
              <span>{label}</span>
              {active && (
                <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-foreground" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
