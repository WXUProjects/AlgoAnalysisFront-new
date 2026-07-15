import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ProblemUserProfile } from '@shared/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COLORS = [
  'var(--color-chart-1, #8884d8)',
  'var(--color-chart-2, #82ca9d)',
  'var(--color-chart-3, #ffc658)',
  'var(--color-chart-4, #ff7c7c)',
  'var(--color-chart-5, #8dd1e1)',
]

function isJunkLabel(name?: string | null): boolean {
  const s = (name || '').trim()
  if (!s) return true
  const u = s.toUpperCase()
  return u === 'UNKNOWN' || u === 'NULL' || u === 'NONE' || s === '未知' || s === '未标注'
}

function shortLabel(name: string, max = 8): string {
  const t = name.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export function AlgoProfileChart({ data }: { data: ProblemUserProfile | null }) {
  if (!data) {
    return <p className="text-sm text-muted-foreground">暂无算法画像数据</p>
  }

  const radar = data.radar
    .filter((r) => r.tag?.trim() && !isJunkLabel(r.tag))
    .slice(0, 10)
    .map((r) => ({
      name: r.tag.trim(),
      short: shortLabel(r.tag.trim(), 10),
      count: r.acCount,
    }))
  const platforms = data.platforms
    .filter((p) => p.name?.trim() && !isJunkLabel(p.name))
    .map((p) => ({ name: p.name.trim(), value: p.count }))
  const diffs = data.difficulties
    .filter((d) => d.name?.trim() && !isJunkLabel(d.name))
    .map((d) => ({ name: d.name.trim(), value: d.count }))

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="gap-2 py-3 lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between px-4 py-0">
          <CardTitle className="text-sm font-medium">标签 AC Top</CardTitle>
          <span className="text-xs text-muted-foreground">总 AC {data.totalAc}</span>
        </CardHeader>
        <CardContent className="h-56 px-2">
          {radar.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={radar}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="short"
                  width={96}
                  interval={0}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v) => [v, 'AC']}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { name?: string } | undefined
                    return row?.name || ''
                  }}
                />
                <Bar dataKey="count" fill="var(--color-chart-1, #8884d8)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="px-2 text-sm text-muted-foreground">暂无标签</p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-2 py-3">
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-sm font-medium">平台分布</CardTitle>
        </CardHeader>
        <CardContent className="h-44 px-2">
          {platforms.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={platforms} dataKey="value" nameKey="name" outerRadius={64}>
                  {platforms.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="px-2 text-sm text-muted-foreground">暂无</p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-2 py-3 lg:col-span-2">
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-sm font-medium">难度分布</CardTitle>
        </CardHeader>
        <CardContent className="h-44 px-2">
          {diffs.length ? (
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
