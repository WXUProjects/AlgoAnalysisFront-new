import { Link } from 'react-router-dom'
import { ClipboardPasteIcon, ChevronRightIcon } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const tools = [
  {
    to: '/tools/paste',
    title: '粘贴板',
    desc: '分享代码、日志或配置：生成链接发给别人，支持语法高亮与有效期。',
    icon: ClipboardPasteIcon,
  },
]

export function ToolsHub() {
  return (
    <PageShell className="mx-auto w-full max-w-2xl gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">工具</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          常用小工具合集，后续会继续增加。
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {tools.map((t) => (
          <Link key={t.to} to={t.to} className="group block">
            <Card className="transition-colors group-hover:border-primary/40 group-hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <t.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <CardDescription className="mt-0.5">{t.desc}</CardDescription>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardHeader>
              <CardContent className="pt-0" />
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  )
}
