import { Link } from 'react-router-dom'
import type { SubmitLogItem } from '@shared/api'
import { Badge } from '@/components/ui/badge'
import { StatusBadge, formatSubmitStatus } from '@/components/status-badge'
import { formatActivityProblemTitle } from '@/lib/activity-title'
import { difficultyBadgeClass } from '@/lib/difficulty'
import { formatTime } from '@/lib/format'
import { getSubmitLink } from '@/lib/link'
import { cn } from '@/lib/utils'

/** 旧版提交动态行：用户 · 平台 · 语言 / 题目标题 · 难度 · 状态 · 时间 */
export function SubmitLogRow({ item }: { item: SubmitLogItem }) {
  const submitUrl = getSubmitLink(item.platform, item.contest, item.submitId)
  const title = formatActivityProblemTitle(
    item.problem,
    item.problemTitle,
    item.contest,
  )
  const displayName = item.userName || `用户${item.userId}`

  return (
    <div
      data-submit-log-row=""
      className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm">
          <Link
            to={`/profile?id=${item.userId}`}
            className="font-medium hover:underline"
          >
            {displayName}
          </Link>
          <span className="text-muted-foreground">
            {' '}
            · {item.platform} · {item.lang || '-'}
          </span>
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {item.problemId ? (
            <Link
              to={`/question-bank/detail/${item.problemId}`}
              className="text-foreground hover:underline"
            >
              {title}
            </Link>
          ) : (
            <span>{title}</span>
          )}
          {item.problemDifficulty ? (
            <Badge
              variant="outline"
              className={cn(
                'h-5 px-1.5 text-[10px] font-normal',
                difficultyBadgeClass(item.problemDifficulty),
              )}
            >
              {item.problemDifficulty}
            </Badge>
          ) : null}
          {submitUrl ? (
            <StatusBadge status={item.status} asChild>
              <a
                href={submitUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {formatSubmitStatus(item.status)}
              </a>
            </StatusBadge>
          ) : (
            <StatusBadge status={item.status} />
          )}
        </div>
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatTime(item.time)}
      </span>
    </div>
  )
}

export function SubmitLogRowSkeleton() {
  return (
    <div className="px-4 py-3">
      <div className="mb-2 h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
    </div>
  )
}
