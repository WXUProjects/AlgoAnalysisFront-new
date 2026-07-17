import type { BlogSocialLink } from '@shared/api'
import { AtSignIcon, GlobeIcon, LinkIcon, MailIcon, RssIcon } from 'lucide-react'

function SvgIcon({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className || 'size-[0.85rem]'}
      aria-hidden
    >
      {children}
    </svg>
  )
}

function GithubSvg({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
    </SvgIcon>
  )
}

function XSvg({ className }: { className?: string }) {
  return (
    <SvgIcon className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.727-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </SvgIcon>
  )
}

/** Map social type → icon */
export function SocialIcon({
  type,
  className,
}: {
  type: string
  className?: string
}) {
  const t = type.toLowerCase()
  const cn = className
  if (t === 'github') return <GithubSvg className={cn} />
  if (t === 'twitter' || t === 'x') return <XSvg className={cn} />
  if (t === 'email' || t === 'mail') return <MailIcon className={cn} />
  if (t === 'rss' || t === 'feed') return <RssIcon className={cn} />
  if (t === 'bilibili') return <AtSignIcon className={cn} />
  if (t === 'zhihu') return <GlobeIcon className={cn} />
  return <LinkIcon className={cn} />
}

export function socialAriaLabel(link: BlogSocialLink) {
  if (link.label) return link.label
  const t = link.type.toLowerCase()
  if (t === 'github') return 'GitHub'
  if (t === 'twitter' || t === 'x') return 'X / Twitter'
  if (t === 'email' || t === 'mail') return '邮箱'
  if (t === 'rss' || t === 'feed') return 'RSS'
  if (t === 'bilibili') return 'Bilibili'
  if (t === 'zhihu') return '知乎'
  return link.type || '链接'
}
