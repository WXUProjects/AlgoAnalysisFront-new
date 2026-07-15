import { Link } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function NotFound() {
  return (
    <PageShell className="items-center justify-center" stagger={false}>
      <Card className="w-full max-w-md text-center motion-lift">
        <CardHeader>
          <CardTitle>404</CardTitle>
          <CardDescription>页面不存在</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            你访问的路径不存在，或已被移除。
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link to="/">返回首页</Link>
          </Button>
        </CardFooter>
      </Card>
    </PageShell>
  )
}
