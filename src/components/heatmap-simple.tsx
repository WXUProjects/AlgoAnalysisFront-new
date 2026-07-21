import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { HeatmapItem } from '@shared/api'
import { cn } from '@/lib/utils'
import {
  animateHoverTransformIn,
  animateHoverTransformOut,
  canHover,
  MOTION,
} from '@/lib/motion'

interface HeatmapSimpleProps {
  items: HeatmapItem[]
  className?: string
  /** 切换年份时的加载态（懒加载年数据时用） */
  yearLoading?: boolean
  /** 点击年份；未传则本地切换（数据已全量时） */
  onYearChange?: (year: number) => void
  /** 受控年份；不传则组件内自管 */
  year?: number
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

type TipState = { key: string; count: number; x: number; y: number } | null

const HeatCell = memo(function HeatCell({
  dayKey,
  count,
  onShowTip,
  onHideTip,
}: {
  dayKey: string
  count: number
  onShowTip: (tip: NonNullable<TipState>) => void
  onHideTip: () => void
}) {
  const bg = blockColor(count)
  const handleEnter = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (canHover()) {
        animateHoverTransformIn(e.currentTarget, {
          scale: MOTION.hover.heatScale,
        })
      }
      const r = e.currentTarget.getBoundingClientRect()
      onShowTip({
        key: dayKey,
        count,
        x: r.left + r.width / 2,
        y: r.top,
      })
    },
    [count, dayKey, onShowTip],
  )
  const handleLeave = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      animateHoverTransformOut(e.currentTarget)
      onHideTip()
    },
    [onHideTip],
  )
  return (
    <div
      className="size-[10px] cursor-pointer rounded-[2px] bg-border/60 will-change-transform hover:z-10"
      style={count > 0 ? { backgroundColor: bg } : undefined}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
    />
  )
})

/** GitHub 风格贡献热力图；单层 tooltip，避免 365 个 Radix 实例卡顿 */
export function HeatmapSimple({
  items,
  className,
  yearLoading,
  onYearChange,
  year: yearProp,
}: HeatmapSimpleProps) {
  const countMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of items) {
      const key =
        i.date.length === 8
          ? `${i.date.slice(0, 4)}-${i.date.slice(4, 6)}-${i.date.slice(6, 8)}`
          : i.date.slice(0, 10)
      map.set(key, i.count)
    }
    return map
  }, [items])

  /** 从最早有数据年份连续到今年（用户有多少年就列多少年） */
  const years = useMemo(() => {
    const nowY = new Date().getFullYear()
    let minY = nowY
    let maxY = nowY
    for (const i of items) {
      const y = Number(String(i.date).slice(0, 4))
      if (!y) continue
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    if (maxY < nowY) maxY = nowY
    const list: number[] = []
    for (let y = maxY; y >= minY; y--) list.push(y)
    return list
  }, [items])

  const [innerYear, setInnerYear] = useState(
    () => years[0] || new Date().getFullYear(),
  )
  const year = yearProp ?? innerYear

  useEffect(() => {
    if (years.length === 0) return
    if (!years.includes(year)) {
      const next = years[0]
      if (yearProp === undefined) setInnerYear(next)
      onYearChange?.(next)
    }
  }, [years, year, yearProp, onYearChange])

  const [tip, setTip] = useState<TipState>(null)
  const showTip = useCallback((t: NonNullable<TipState>) => setTip(t), [])
  const hideTip = useCallback(() => setTip(null), [])

  const days = yearDays(year)
  const pad = firstDayOffset(year)

  const cells = useMemo(() => {
    const out: { key: string; count: number }[] = []
    for (let i = 0; i < days; i++) {
      const day = i + 1
      const key = dateKey(year, day)
      out.push({ key, count: countMap.get(key) ?? 0 })
    }
    return out
  }, [countMap, days, year])

  function selectYear(y: number) {
    if (y === year) return
    // 立刻切 UI，重数据渲染走 transition，避免点完像卡住
    startTransition(() => {
      if (yearProp === undefined) setInnerYear(y)
      onYearChange?.(y)
    })
  }

  return (
    <div className={cn('select-none', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-2">
        <div
          className={cn(
            'relative min-w-0 flex-1 overflow-x-auto pb-1 transition-opacity',
            yearLoading && 'pointer-events-none opacity-50',
          )}
        >
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
                className="absolute left-0 top-0 flex w-10 -translate-x-full flex-col justify-around pr-1 text-[11px] text-muted-foreground"
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
                {cells.map((c) => (
                  <HeatCell
                    key={c.key}
                    dayKey={c.key}
                    count={c.count}
                    onShowTip={showTip}
                    onHideTip={hideTip}
                  />
                ))}
              </div>
            </div>
          </div>

          {yearLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground">
                加载中…
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-row gap-1.5 overflow-x-auto sm:max-h-[110px] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => selectYear(y)}
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

      {tip &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
            style={{ left: tip.x, top: tip.y - 6 }}
          >
            <span className="font-medium">{tip.key}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span>{tip.count} 次</span>
          </div>,
          document.body,
        )}
    </div>
  )
}
