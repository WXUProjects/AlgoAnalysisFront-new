import { Link } from 'react-router-dom'
import {
  ClipboardPasteIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  ImageIcon,
  CompassIcon,
  BookOpenIcon,
  CameraIcon,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

type LinkItem = {
  title: string
  desc: string
  icon: typeof ClipboardPasteIcon
  badge?: string
} & (
  | { kind: 'internal'; to: string }
  | { kind: 'external'; href: string }
)

const tools: LinkItem[] = [
  {
    kind: 'internal',
    to: '/tools/paste',
    title: '粘贴板',
    desc: '分享代码、日志或配置：生成链接发给别人，支持语法高亮与有效期。',
    icon: ClipboardPasteIcon,
  },
  {
    kind: 'internal',
    to: '/tools/code-image',
    title: '代码转图片',
    desc: '把代码导出成 Carbon 风格精美图片，支持主题、字体、行号与语言自动识别。',
    icon: CameraIcon,
  },
  {
    kind: 'external',
    href: 'https://guadart.fun/',
    title: 'Guadart 生图站',
    desc: '作者维护的 AI 绘图站，支持多种主流模型。欢迎体验，也是对 GoAlgo 的一份支持。',
    icon: ImageIcon,
    badge: '推荐',
  },
]

const friendLinks: LinkItem[] = [
  {
    kind: 'external',
    href: 'https://xcpc.link/',
    title: 'XCPC Link',
    desc: '算法竞赛资源导航：OJ、ICPC/CCPC 赛程、榜单工具、模板与社区入口，覆盖选手、教练与出题人。',
    icon: CompassIcon,
  },
  {
    kind: 'external',
    href: 'https://acmer.info/',
    title: 'ACMer.info',
    desc: '面向 ACMer 的导航站：整理群组、博客、资料与比赛信息，开源共建、持续更新。',
    icon: BookOpenIcon,
  },
]

function LinkCard({
  item,
  isLogin,
}: {
  item: LinkItem
  isLogin: boolean
}) {
  const body = (
    <Card
      className={cn(
        'relative transition-colors group-hover:border-primary/40 group-hover:bg-muted/30',
        item.badge && 'overflow-hidden',
      )}
    >
      {item.badge ? (
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 z-10 rounded-md px-1.5 py-0 text-[10px] font-semibold tracking-wide"
        >
          {item.badge}
        </Badge>
      ) : null}
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <item.icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1 pr-8">
          <CardTitle className="text-base">{item.title}</CardTitle>
          <CardDescription className="mt-0.5">{item.desc}</CardDescription>
        </div>
        {item.kind === 'external' ? (
          <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        ) : (
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        )}
      </CardHeader>
      <CardContent className="pt-0" />
    </Card>
  )

  if (item.kind === 'external') {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        {body}
      </a>
    )
  }

  // 站内工具需登录；外链可直接打开
  const to = isLogin
    ? item.to
    : `/login?redirect=${encodeURIComponent(item.to)}`

  return (
    <Link to={to} className="group block">
      {body}
    </Link>
  )
}

function Section({
  title,
  subtitle,
  items,
  isLogin,
}: {
  title: string
  subtitle: string
  items: LinkItem[]
  isLogin: boolean
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <LinkCard
            key={item.kind === 'internal' ? item.to : item.href}
            item={item}
            isLogin={isLogin}
          />
        ))}
      </div>
    </section>
  )
}

export function ToolsHub() {
  const { isLogin } = useAuth()

  return (
    <PageShell className="mx-auto w-full max-w-2xl gap-8 p-6">
      <Section
        title="工具"
        subtitle="常用小工具合集，后续会继续增加。"
        items={tools}
        isLogin={isLogin}
      />
      <Section
        title="友情链接"
        subtitle="算法竞赛相关导航与资源站，新窗口打开。"
        items={friendLinks}
        isLogin={isLogin}
      />
    </PageShell>
  )
}
