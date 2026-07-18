import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { MOTION, prefersReducedMotion } from '@/lib/motion'
import {
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ProblemUserProfile } from '@shared/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const CLOUD_COLORS = [
  'text-sky-600 dark:text-sky-400',
  'text-violet-600 dark:text-violet-400',
  'text-emerald-600 dark:text-emerald-400',
  'text-amber-600 dark:text-amber-400',
  'text-rose-600 dark:text-rose-400',
  'text-indigo-600 dark:text-indigo-400',
  'text-teal-600 dark:text-teal-400',
  'text-fuchsia-600 dark:text-fuchsia-400',
]

const DIFF_ORDER: Record<string, number> = {
  简单: 0,
  中等: 1,
  困难: 2,
  Easy: 0,
  Medium: 1,
  Hard: 2,
}

function isJunkLabel(name?: string | null): boolean {
  const s = (name || '').trim()
  if (!s) return true
  const u = s.toUpperCase()
  return u === 'UNKNOWN' || u === 'NULL' || u === 'NONE' || s === '未知' || s === '未标注'
}

function shortLabel(name: string, max = 12): string {
  const t = name.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

function TagWordCloud({ items }: { items: { name: string; count: number }[] }) {
  if (!items.length) {
    return <p className="px-2 text-sm text-muted-foreground">暂无标签</p>
  }
  const max = Math.max(...items.map((i) => i.count), 1)
  const ordered = [...items].sort((a, b) => b.count - a.count).slice(0, 36)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full min-h-0 flex-wrap content-center items-center justify-center gap-x-3 gap-y-2.5 px-3 py-2">
        {ordered.map((item, i) => {
          const w = item.count / max
          const size = 0.75 + w * 0.65
          const weight = w > 0.55 ? 700 : w > 0.3 ? 600 : 500
          return (
            <UiTooltip key={item.name}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'cursor-default select-none rounded-md px-0.5 leading-tight',
                    'transition-opacity duration-150 hover:opacity-100',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    CLOUD_COLORS[i % CLOUD_COLORS.length],
                  )}
                  style={{
                    fontSize: `${size}rem`,
                    fontWeight: weight,
                    opacity: 0.55 + w * 0.45,
                  }}
                >
                  {item.name}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="tabular-nums">
                {item.name} · 已 AC {item.count}
              </TooltipContent>
            </UiTooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

type Panel = {
  key: string
  title: string
  hint?: string
  body: React.ReactNode
}

function ProfilePanels({
  row1,
  row2,
}: {
  row1: Panel[]
  row2: Panel[]
}) {
  const all = [...row1, ...row2]
  const [index, setIndex] = useState(0)
  const touchX = useRef<number | null>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const n = all.length

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => (i + dir + n) % n)
    },
    [n],
  )

  useEffect(() => {
    setIndex(0)
  }, [n])

  useLayoutEffect(() => {
    const root = stackRef.current
    if (!root) return
    const cards = root.querySelectorAll<HTMLElement>('[data-stack-card]')
    cards.forEach((el) => {
      const offset = Number(el.dataset.offset ?? 0)
      const abs = Math.abs(offset)
      const xPx = offset * 22
      const yPx = abs * 10
      const scale = 1 - abs * 0.08
      const opacity = abs === 0 ? 1 : abs === 1 ? 0.72 : 0.4
      gsap.killTweensOf(el)
      if (prefersReducedMotion()) {
        gsap.set(el, { x: xPx, y: yPx, scale, opacity, zIndex: 10 - abs })
        return
      }
      gsap.to(el, {
        x: xPx,
        y: yPx,
        scale,
        opacity,
        zIndex: 10 - abs,
        duration: MOTION.duration.base,
        ease: MOTION.ease.sheet,
        overwrite: true,
      })
    })
  }, [index, n, all.length])

  return (
    <>
      {/* 桌面：两行 — 第一行雷达/难度，第二行词云/Top */}
      <div className="hidden flex-col gap-3 lg:flex">
        <div className="grid gap-3 lg:grid-cols-2">
          {row1.map((p) => (
            <Card key={p.key} className="gap-2 py-3">
              <CardHeader className="flex flex-row items-center justify-between px-4 py-0">
                <CardTitle className="text-sm font-medium">{p.title}</CardTitle>
                {p.hint ? (
                  <span className="text-xs text-muted-foreground">{p.hint}</span>
                ) : null}
              </CardHeader>
              <CardContent className="h-52 px-2">{p.body}</CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {row2.map((p) => (
            <Card key={p.key} className="gap-2 py-3">
              <CardHeader className="flex flex-row items-center justify-between px-4 py-0">
                <CardTitle className="text-sm font-medium">{p.title}</CardTitle>
                {p.hint ? (
                  <span className="text-xs text-muted-foreground">{p.hint}</span>
                ) : null}
              </CardHeader>
              <CardContent className="h-56 px-2">{p.body}</CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 移动端：牌叠滑动 — GSAP 驱动位移/缩放 */}
      <div className="lg:hidden">
        <div
          ref={stackRef}
          className="relative mx-auto w-full max-w-md select-none overflow-hidden touch-pan-y overscroll-x-none px-5"
          style={{ height: 300 }}
          onTouchStart={(e) => {
            touchX.current = e.touches[0]?.clientX ?? null
          }}
          onTouchEnd={(e) => {
            if (touchX.current == null) return
            const x = e.changedTouches[0]?.clientX
            if (x == null) return
            const dx = x - touchX.current
            touchX.current = null
            if (Math.abs(dx) < 40) return
            if (dx < 0) go(1)
            else go(-1)
          }}
        >
          {all.map((p, i) => {
            let offset = i - index
            if (offset > n / 2) offset -= n
            if (offset < -n / 2) offset += n
            const abs = Math.abs(offset)
            if (abs > 2) return null
            const active = offset === 0
            return (
              <Card
                key={p.key}
                data-stack-card=""
                data-offset={offset}
                className={cn(
                  'absolute inset-x-5 top-0 gap-2 py-3 will-change-transform',
                  active
                    ? 'pointer-events-auto shadow-lg ring-1 ring-border/50'
                    : 'pointer-events-none shadow-md',
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between px-4 py-0">
                  <CardTitle className="text-sm font-medium">{p.title}</CardTitle>
                  {p.hint ? (
                    <span className="text-xs text-muted-foreground">{p.hint}</span>
                  ) : null}
                </CardHeader>
                <CardContent className="h-48 px-2">{p.body}</CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            onClick={() => go(-1)}
            aria-label="上一张"
          >
            ‹
          </button>
          {all.map((p, i) => (
            <button
              key={p.key}
              type="button"
              aria-label={p.title}
              className={cn(
                'size-2 rounded-full transition-colors',
                i === index ? 'bg-sky-600' : 'bg-muted-foreground/30',
              )}
              onClick={() => setIndex(i)}
            />
          ))}
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            onClick={() => go(1)}
            aria-label="下一张"
          >
            ›
          </button>
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          左右滑动切换 · {all[index]?.title}
        </p>
      </div>
    </>
  )
}

export function AlgoProfileChart({ data }: { data: ProblemUserProfile | null }) {
  if (!data) {
    return <p className="text-sm text-muted-foreground">暂无数据，通过题目后生成</p>
  }

  const radarAll = data.radar
    .filter((r) => r.tag?.trim() && !isJunkLabel(r.tag))
    .map((r) => ({
      name: r.tag.trim(),
      short: shortLabel(r.tag.trim(), 12),
      count: r.acCount,
      score: typeof r.score === 'number' ? r.score : 0,
    }))
  const radarChart = [...radarAll]
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, 8)
    .map((r) => ({
      subject: shortLabel(r.name, 6),
      fullName: r.name,
      score: Math.max(0, Math.min(100, r.score)),
      acCount: r.count,
    }))
  const diffs = data.difficulties
    .filter((d) => d.name?.trim() && !isJunkLabel(d.name))
    .map((d) => ({ name: d.name.trim(), value: d.count }))
    .sort((a, b) => (DIFF_ORDER[a.name] ?? 99) - (DIFF_ORDER[b.name] ?? 99))

  const maxAc = Math.max(...radarAll.map((r) => r.count), 1)

  const row1: Panel[] = [
    {
      key: 'radar',
      title: '能力雷达',
      hint: `总 AC ${data.totalAc}`,
      body: radarChart.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarChart} cx="50%" cy="52%" outerRadius="68%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
              tickCount={5}
            />
            <Radar
              name="掌握度"
              dataKey="score"
              stroke="var(--color-chart-1, #8884d8)"
              fill="var(--color-chart-1, #8884d8)"
              fillOpacity={0.35}
            />
            <Tooltip
              formatter={(value) => [`${value}`, '掌握度']}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as
                  | { fullName?: string; acCount?: number }
                  | undefined
                if (!row?.fullName) return ''
                return `${row.fullName}${row.acCount != null ? ` · 已 AC ${row.acCount}` : ''}`
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      ) : (
        <p className="px-2 text-sm text-muted-foreground">暂无</p>
      ),
    },
    {
      key: 'diff',
      title: '难度分布',
      body: diffs.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={diffs} margin={{ left: 0, right: 8 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} width={28} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="var(--color-chart-2, #82ca9d)" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="px-2 text-sm text-muted-foreground">暂无</p>
      ),
    },
  ]

  const row2: Panel[] = [
    {
      key: 'cloud',
      title: '标签词云',
      body: (
        <div className="h-full overflow-y-auto">
          <TagWordCloud items={radarAll} />
        </div>
      ),
    },
    {
      key: 'top',
      title: '标签 AC Top',
      hint: `${radarAll.length} 项 · 可滚动`,
      body: radarAll.length ? (
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1.5 py-0.5 pl-2">
            {radarAll.map((row) => (
              <div key={row.name} className="contents" title={`${row.name} · 已 AC ${row.count}`}>
                <span className="max-w-[6rem] truncate text-left text-[11px] text-muted-foreground">
                  {row.short}
                </span>
                <div className="h-4 min-w-0 rounded-sm bg-muted/40">
                  <div
                    className="h-full rounded-sm bg-[var(--color-chart-1,#8884d8)]"
                    style={{ width: `${(row.count / maxAc) * 100}%` }}
                  />
                </div>
                <span className="min-w-[1.25rem] text-right text-[11px] tabular-nums text-muted-foreground">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="px-2 text-sm text-muted-foreground">暂无标签</p>
      ),
    },
  ]

  return <ProfilePanels row1={row1} row2={row2} />
}
