import { Link } from 'react-router-dom'
import { BookmarkIcon, FlameIcon, UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { FeedScope } from './types'

type Props = {
  feedScope: FeedScope
  onFeedScope: (s: FeedScope) => void
  isLogin: boolean
  streakDays?: number | null
  followingCount?: number | null
  /** 提交动态且非「看他人」时展示范围切换（含「我的」） */
  showFeedScope?: boolean
}

/** 左侧仅个人看板 + 提交动态范围（视图切换与顶部 Tab 重复，已去掉） */
export function LeftRail({
  feedScope,
  onFeedScope,
  isLogin,
  streakDays,
  followingCount,
  showFeedScope,
}: Props) {
  return (
    <aside
      data-discover-left-rail=""
      className="hidden w-[220px] shrink-0 flex-col gap-3 lg:flex"
    >
      {showFeedScope ? (
        <Card className="gap-2 py-3 shadow-none">
          <CardHeader className="px-3 pb-0 pt-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              提交范围
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-0.5 px-3">
            {(
              [
                { key: 'org' as const, label: '组织' },
                ...(isLogin
                  ? [
                      { key: 'following' as const, label: '仅关注' },
                      { key: 'mine' as const, label: '我的' },
                    ]
                  : []),
              ] as const
            ).map(({ key, label }) => (
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
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-2 py-3 shadow-none">
        <CardHeader className="px-3 pb-0 pt-0">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            个人看板
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2 text-sm">
            <FlameIcon className="size-4 text-orange-500" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">本周 AC</p>
              <p className="font-semibold tabular-nums">
                {isLogin
                  ? streakDays != null
                    ? `${streakDays} 题`
                    : '…'
                  : '登录后查看'}
              </p>
            </div>
          </div>
          {isLogin ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="justify-start px-2.5"
              >
                <Link to="/social?tab=following&page=1">
                  <UsersIcon data-icon="inline-start" />
                  我的关注
                  {followingCount != null ? (
                    <span className="ml-auto tabular-nums text-muted-foreground">
                      {followingCount}
                    </span>
                  ) : null}
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="justify-start px-2.5"
              >
                <Link to="/question-bank">
                  <BookmarkIcon data-icon="inline-start" />
                  题库收藏夹
                </Link>
              </Button>
            </>
          ) : (
            <p className="px-0.5 text-xs text-muted-foreground">
              登录后可查看打卡与关注快捷入口
            </p>
          )}
        </CardContent>
      </Card>
    </aside>
  )
}
