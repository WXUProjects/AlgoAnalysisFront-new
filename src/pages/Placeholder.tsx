import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>该功能暂未开放</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            页面「{title}」正在准备中，请稍后再来。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
