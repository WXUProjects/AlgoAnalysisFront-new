import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { ContestHandDrawnRing } from '@/components/contest-hand-drawn-ring'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'] as const

export function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const d = new Date(`${ymd}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function monthLabel(year: number, monthIndex: number): string {
  return `${year} 年 ${monthIndex + 1} 月`
}

/** 生成月历格子：周一为一周起始，含上/下月补位 */
export function buildMonthCells(
  year: number,
  monthIndex: number,
): { date: Date; inMonth: boolean; ymd: string }[] {
  const first = new Date(year, monthIndex, 1)
  // JS: 0=日 … 6=六 → 周一=0
  const mondayOffset = (first.getDay() + 6) % 7
  const start = new Date(year, monthIndex, 1 - mondayOffset)
  const cells: { date: Date; inMonth: boolean; ymd: string }[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    cells.push({
      date,
      inMonth: date.getMonth() === monthIndex,
      ymd: toYmd(date),
    })
  }
  const lastWeekAllOut = cells.slice(35).every((c) => !c.inMonth)
  return lastWeekAllOut ? cells.slice(0, 35) : cells
}

export interface ContestMonthGridProps {
  year: number
  monthIndex: number
  /** 无选中时传空字符串 */
  selectedYmd: string
  todayYmd: string
  /** ymd → 当天比赛场次 */
  countByDay: Map<string, number>
  onSelectDay: (ymd: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onGoToday: () => void
  loading?: boolean
  /** 侧边栏紧凑样式 */
  compact?: boolean
}

export function ContestMonthGrid({
  year,
  monthIndex,
  selectedYmd,
  todayYmd,
  countByDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  loading,
  compact = false,
}: ContestMonthGridProps) {
  const cells = buildMonthCells(year, monthIndex)
  const isCurrentMonth = todayYmd.startsWith(
    `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
  )

  return (
    <div className={cn('flex flex-col', compact ? 'gap-2' : 'gap-3')}>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="上个月"
            onClick={onPrevMonth}
          >
            <ChevronLeftIcon />
          </Button>
          <h3
            className={cn(
              'min-w-0 text-center font-semibold tracking-tight tabular-nums',
              compact ? 'text-sm' : 'min-w-[8.5rem] text-base',
            )}
          >
            {monthLabel(year, monthIndex)}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="下个月"
            onClick={onNextMonth}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(compact && 'h-7 px-2 text-xs')}
          disabled={isCurrentMonth && !selectedYmd}
          onClick={onGoToday}
        >
          今天
        </Button>
      </div>

      <div
        className={cn(
          'grid grid-cols-7',
          compact ? 'gap-0.5' : 'gap-1 sm:gap-1.5',
          loading && 'opacity-60',
        )}
        role="grid"
        aria-label={`${monthLabel(year, monthIndex)} 比赛日历`}
      >
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            role="columnheader"
            className={cn(
              'text-center font-medium text-muted-foreground',
              compact ? 'pb-0.5 text-[10px]' : 'pb-1 text-xs',
            )}
          >
            {w}
          </div>
        ))}

        {cells.map((cell) => {
          const count = countByDay.get(cell.ymd) ?? 0
          const hasContest = count > 0
          const selected = Boolean(selectedYmd) && cell.ymd === selectedYmd
          const isToday = cell.ymd === todayYmd

          return (
            <button
              key={cell.ymd}
              type="button"
              role="gridcell"
              aria-selected={selected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={
                [
                  cell.ymd,
                  isToday ? '今天' : '',
                  hasContest ? `${count} 场比赛` : '',
                  selected ? '已选中' : '',
                ]
                  .filter(Boolean)
                  .join('，')
              }
              onClick={() => onSelectDay(cell.ymd)}
              className={cn(
                'relative flex min-h-0 flex-col items-center justify-center gap-0.5 transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                compact
                  ? 'aspect-square rounded-md p-0'
                  : 'aspect-square rounded-lg p-0.5',
                !cell.inMonth && 'opacity-35',
                !selected && 'hover:bg-muted/50',
              )}
            >
              {/* 选中：手绘圈；有赛默认只显示下方小点 */}
              {selected ? (
                <ContestHandDrawnRing dayKey={cell.ymd} active />
              ) : null}

              <span
                className={cn(
                  'relative z-[1] flex items-center justify-center tabular-nums',
                  compact ? 'size-6 text-xs' : 'size-7 text-sm',
                  // 今天：始终用淡底圆标出，不抢有赛/选中的视觉
                  isToday &&
                    !selected &&
                    'rounded-full bg-muted text-muted-foreground',
                  isToday && selected && 'text-primary',
                  selected && !isToday && 'font-semibold text-primary',
                )}
              >
                {cell.date.getDate()}
              </span>

              {/* 有赛：日期下方小点（固定占位，避免格子跳动） */}
              <span
                className="relative z-[1] flex h-1.5 items-center justify-center"
                aria-hidden
              >
                {hasContest ? (
                  <span
                    className={cn(
                      'size-1 rounded-full',
                      selected ? 'bg-primary' : 'bg-foreground/45',
                    )}
                  />
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
