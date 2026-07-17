import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { FeedScope } from './types'

type Props = {
  feedScope: FeedScope
  onFeedScope: (s: FeedScope) => void
  isLogin: boolean
  /** rail：左侧竖排；chips：移动端横排 */
  variant?: 'rail' | 'chips'
  className?: string
}

const SCOPES: { key: FeedScope; label: string; needLogin?: boolean }[] = [
  { key: 'org', label: '组织' },
  { key: 'following', label: '仅关注', needLogin: true },
  { key: 'mine', label: '我的', needLogin: true },
]

/** 提交动态范围切换：桌面竖栏 / 移动横芯片 */
export function FeedScopeBar({
  feedScope,
  onFeedScope,
  isLogin,
  variant = 'chips',
  className,
}: Props) {
  const options = SCOPES.filter((s) => !s.needLogin || isLogin)

  if (variant === 'rail') {
    return (
      <div
        data-discover-feed-scope=""
        data-variant="rail"
        className={cn('flex flex-col gap-0.5', className)}
      >
        {options.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onFeedScope(key)}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
              feedScope === key
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/50',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      data-discover-feed-scope=""
      data-variant="chips"
      className={cn('flex flex-col gap-1.5', className)}
    >
      <p className="text-xs font-medium text-muted-foreground">提交范围</p>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={feedScope}
        onValueChange={(v) => {
          if (v === 'org' || v === 'following' || v === 'mine') {
            onFeedScope(v)
          }
        }}
        className="w-full max-w-full flex-wrap justify-start"
      >
        {options.map(({ key, label }) => (
          <ToggleGroupItem key={key} value={key} className="px-3 text-xs">
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
