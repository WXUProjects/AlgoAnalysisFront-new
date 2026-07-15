import { useLocation } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function Placeholder({ title }: { title: string }) {
  const { pathname } = useLocation()
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            路由 <code className="text-foreground">{pathname}</code> — 待实现
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            见 AGENTS.md 模块清单 / PHASES.md 阶段规划
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
