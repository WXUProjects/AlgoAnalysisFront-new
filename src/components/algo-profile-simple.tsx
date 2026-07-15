import type { ProblemUserProfile } from '@shared/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AlgoProfileSimple({ data }: { data: ProblemUserProfile | null }) {
  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">暂无算法画像数据</p>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="gap-2 py-3">
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-sm font-medium">总 AC</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <p className="text-2xl font-semibold">{data.totalAc}</p>
        </CardContent>
      </Card>
      <Card className="gap-2 py-3 sm:col-span-2">
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-sm font-medium">标签强度（Top）</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5 px-4">
          {data.radar
            .filter((r) => r.tag?.trim())
            .slice(0, 12)
            .map((r) => (
              <Badge key={r.tag} variant="secondary">
                {r.tag} · {r.acCount}
              </Badge>
            ))}
          {!data.radar.some((r) => r.tag?.trim()) && (
            <span className="text-sm text-muted-foreground">暂无标签</span>
          )}
        </CardContent>
      </Card>
      <Card className="gap-2 py-3">
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-sm font-medium">平台</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 px-4 text-sm">
          {data.platforms.map((p) => (
            <div key={p.name} className="flex justify-between gap-2">
              <span className="text-muted-foreground">{p.name}</span>
              <span>{p.count}</span>
            </div>
          ))}
          {!data.platforms.length && (
            <span className="text-muted-foreground">暂无</span>
          )}
        </CardContent>
      </Card>
      <Card className="gap-2 py-3 sm:col-span-2">
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-sm font-medium">难度分布</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5 px-4">
          {data.difficulties
            .filter((d) => {
              const n = (d.name || '').trim()
              if (!n) return false
              const u = n.toUpperCase()
              return u !== 'UNKNOWN' && u !== 'NULL' && u !== 'NONE'
            })
            .map((d) => (
              <Badge key={d.name} variant="outline">
                {d.name}: {d.count}
              </Badge>
            ))}
          {!data.difficulties.some((d) => {
            const n = (d.name || '').trim()
            const u = n.toUpperCase()
            return n && u !== 'UNKNOWN' && u !== 'NULL' && u !== 'NONE'
          }) && <span className="text-sm text-muted-foreground">暂无</span>}
        </CardContent>
      </Card>
    </div>
  )
}
