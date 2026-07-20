import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HeatmapItem } from '@shared/api'

interface TrendChartProps {
  submit: HeatmapItem[]
  ac: HeatmapItem[]
  days?: number
}

function localYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function TrendChart({ submit, ac, days = 30 }: TrendChartProps) {
  // 与热力 API 一致用本地日历日；禁止 toISOString（UTC 会错一天）
  const acMap = new Map(ac.map((i) => [i.date.slice(0, 10), i.count]))
  const submitMap = new Map(submit.map((i) => [i.date.slice(0, 10), i.count]))

  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const data: { date: string; submit: number; ac: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    const key = localYmd(d)
    data.push({
      date: key.slice(5),
      submit: submitMap.get(key) ?? 0,
      ac: acMap.get(key) ?? 0,
    })
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={36} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="submit"
            name="提交"
            stroke="var(--color-chart-1, #8884d8)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="ac"
            name="AC"
            stroke="var(--color-chart-2, #82ca9d)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
