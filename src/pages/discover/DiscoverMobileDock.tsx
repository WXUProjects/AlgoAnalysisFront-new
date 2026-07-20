import {
  CalendarIcon,
  ChartLineIcon,
  CompassIcon,
  FlameIcon,
  TrophyIcon,
} from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
 * 发现页移动端视图切换：内联 ToggleGroup（非固定底栏）。
 * 发现 / 数据 / 热题 / 排行 / 赛事
 *
 * 仅在 lg 以下显示，桌面端由 Tabs 承担切换。
 */
export function DiscoverMobileDock({ view, onViewChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(v) => {
        if (v) onViewChange(v as DiscoverMobileView)
      }}
      variant="outline"
      size="sm"
      className="w-full justify-start overflow-x-auto lg:hidden"
    >
      {DOCK_ITEMS.map(({ key, icon: Icon }) => (
        <ToggleGroupItem
          key={key}
          value={key}
          className="min-h-[44px] gap-1.5 text-xs"
          aria-label={DISCOVER_MOBILE_VIEW_LABEL[key]}
        >
          <Icon />
          {DISCOVER_MOBILE_VIEW_LABEL[key]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
