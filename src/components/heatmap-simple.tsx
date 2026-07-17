import {
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type HTMLAttributes,
} from 'react'
import type { HeatmapItem } from '@shared/api'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  animateHoverTransformIn,
  animateHoverTransformOut,
  MOTION,
} from '@/lib/motion'

const HeatCell = forwardRef<
  HTMLDivElement,
  {
    count: number
    bg?: string
  } & HTMLAttributes<HTMLDivElement>
>(function HeatCell({ count, bg, onPointerEnter, onPointerLeave, ...props }, ref) {
  return (
    <div
      ref={ref}
      className="size-[10px] cursor-pointer rounded-[2px] bg-border/60 will-change-transform hover:z-10"
      style={count > 0 && bg ? { backgroundColor: bg } : undefined}
      onPointerEnter={(e) => {
        animateHoverTransformIn(e.currentTarget, {
          scale: MOTION.hover.heatScale,
        })
        onPointerEnter?.(e)
      }}
      onPointerLeave={(e) => {
        animateHoverTransformOut(e.currentTarget)
        onPointerLeave?.(e)
      }}
      {...props}
    />
  )
})

interface HeatmapSimpleProps {
  items: HeatmapItem[]
  className?: string
}

const MONTHS = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
]

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

function dateKey(year: number, dayOfYear: number) {
  const d = new Date(year, 0, dayOfYear)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 对齐旧版 Calendar：绝对次数分档绿色 */
function blockColor(count: number): string {
  if (count === 0) return 'transparent'
  if (count <= 1) return 'rgba(0, 160, 0, 0.2)'
  if (count <= 2) return 'rgba(0, 160, 0, 0.4)'
  if (count <= 6) return 'rgba(0, 160, 0, 0.6)'
  if (count <= 12) return 'rgba(0, 160, 0, 0.8)'
  return 'rgba(0, 160, 0, 1)'
}

function yearDays(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

/** 旧版：new Date(year, 0, 2).getDay() 作为起点偏移 */
function firstDayOffset(year: number) {
  const n = new Date(year, 0, 2).getDay()
  return ((n - 1) % 7 + 7) % 7
}

/** GitHub 风格贡献热力图，对齐旧版 Calendar.vue；悬停用 Tooltip */
export function HeatmapSimple({ items, className }: HeatmapSimpleProps) {
  const countMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of items) {
      const key = i.date.length === 8
        ? `${i.date.slice(0, 4)}-${i.date.slice(4, 6)}-${i.date.slice(6, 8)}`
        : i.date.slice(0, 10)
      map.set(key, i.count)
    }
    return map
  }, [items])

  const years = useMemo(() => {
    const set = new Set<number>()
    for (const i of items) {
      const y = Number(String(i.date).slice(0, 4))
      if (y) set.add(y)
    }
    set.add(new Date().getFullYear())
    return [...set].sort((a, b) => b - a)
  }, [items])

  const [year, setYear] = useState(() => years[0] || new Date().getFullYear())

  // items 异步到达后 years 会变；若当前 year 不在列表里则切到最新有数据年份
  useEffect(() => {
    if (years.length === 0) return
    if (!years.includes(year)) setYear(years[0])
  }, [years, year])

  const days = yearDays(year)
  const pad = firstDayOffset(year)

  return (
    <div className={cn('select-none', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2">
        <div className="relative min-w-0 flex-1 overflow-x-auto pb-1">
          {/* 星期轴 */}
          <div className="pl-10">
            <div
              className="mb-1 grid text-[11px] text-muted-foreground"
              style={{
                width: 53 * 10 + 52 * 2,
                gridTemplateColumns: 'repeat(12, 1fr)',
              }}
            >
              {MONTHS.map((m) => (
                <div key={m} className="text-center">
                  {m}
                </div>
              ))}
            </div>

            <div className="relative">
              <div
                className="absolute left-0 top-0 flex h-[82px] w-10 -translate-x-full flex-col justify-around pr-1 text-[11px] text-muted-foreground"
                style={{ height: 7 * 10 + 6 * 2 }}
              >
                <span className="leading-none">周一</span>
                <span className="leading-none">周三</span>
                <span className="leading-none">周五</span>
              </div>

              <div
                className="grid gap-[2px]"
                style={{
                  width: 53 * 10 + 52 * 2,
                  gridTemplateColumns: 'repeat(53, 10px)',
                  gridTemplateRows: 'repeat(7, 10px)',
                  gridAutoFlow: 'column',
                }}
              >
                {Array.from({ length: pad }).map((_, i) => (
                  <div key={`pad-${i}`} className="size-[10px]" />
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const day = i + 1
                  const key = dateKey(year, day)
                  const count = countMap.get(key) ?? 0
                  const bg = blockColor(count)
                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <HeatCell count={count} bg={bg} />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <span className="font-medium">{key}</span>
                        <span className="mx-1.5 opacity-50">·</span>
                        <span>{count} 次</span>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 年份选择 — 右侧竖排，对齐旧版 */}
        <div className="flex shrink-0 flex-row gap-1.5 overflow-x-auto sm:max-h-[110px] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={cn(
                'h-8 min-w-[4.5rem] shrink-0 rounded-lg border px-3 text-sm transition-colors',
                y === year
                  ? 'border-foreground/20 bg-muted font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted/50',
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
