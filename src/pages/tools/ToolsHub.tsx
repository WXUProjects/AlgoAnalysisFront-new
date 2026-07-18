import { useRef } from 'react'
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
import {
  animateHoverTransformIn,
  animateHoverTransformOut,
  MOTION,
} from '@/lib/motion'

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
    desc: '生成链接分享代码或文本，支持语法高亮，并可设置有效期。',
    icon: ClipboardPasteIcon,
  },
  {
    kind: 'internal',
    to: '/tools/code-image',
    title: '代码转图片',
    desc: '将代码导出为图片，可调主题、字体、行号，并识别语言。',
    icon: CameraIcon,
  },
  {
    kind: 'external',
    href: 'https://guadart.fun/',
    title: 'Guadart 生图站',
    desc: '作者维护的绘图站，支持多种模型。',
    icon: ImageIcon,
    badge: '外链',
  },
]

const friendLinks: LinkItem[] = [
  {
    kind: 'external',
    href: 'https://xcpc.link/',
    title: 'XCPC Link',
    desc: '算法竞赛资源导航：OJ、赛程、榜单、模板与社区，适合选手、教练与出题人。',
    icon: CompassIcon,
  },
  {
    kind: 'external',
    href: 'https://acmer.info/',
    title: 'ACMer.info',
    desc: '面向竞赛选手的导航站，整理群组、博客、资料与比赛信息，持续更新。',
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
  const chevronRef = useRef<SVGSVGElement>(null)

  const onEnter = () => {
    const el = chevronRef.current
    if (el) animateHoverTransformIn(el, { x: MOTION.hover.chevronX })
  }
  const onLeave = () => {
    const el = chevronRef.current
    if (el) animateHoverTransformOut(el)
  }

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
          <ExternalLinkIcon
            ref={chevronRef}
            className="size-4 shrink-0 text-muted-foreground will-change-transform"
          />
        ) : (
          <ChevronRightIcon
            ref={chevronRef}
            className="size-4 shrink-0 text-muted-foreground will-change-transform"
          />
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
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
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
    <Link
      to={to}
      className="group block"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
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
        subtitle="常用小工具"
        items={tools}
        isLogin={isLogin}
      />
      <Section
        title="友情链接"
        subtitle="竞赛相关导航与资源站，将在新窗口打开。"
        items={friendLinks}
        isLogin={isLogin}
      />
    </PageShell>
  )
}
