import { useEffect, useState } from 'react'
import { FileCodeIcon } from 'lucide-react'
import { listBlogStaticSites } from '@/api/blog'
import { BLOG_NEW_TAB_PROPS } from '@/lib/blog-nav'
import { cn } from '@/lib/utils'
import type { BlogStaticSite } from '@shared/api'

export function usePinnedStaticSites(username: string) {
  const [sites, setSites] = useState<BlogStaticSite[]>([])
  useEffect(() => {
    if (!username) return
    let cancelled = false
    void listBlogStaticSites(username).then((res) => {
      if (!cancelled && res.success && res.data) setSites(res.data)
    })
    return () => {
      cancelled = true
    }
  }, [username])
  return sites
}

export function StaticNavAnchors({
  sites,
  className,
  linkClassName,
  onClick,
}: {
  sites: BlogStaticSite[]
  className?: string
  linkClassName?: string
  onClick?: () => void
}) {
  if (!sites.length) return null
  return (
    <>
      {sites.map((site) => (
        <a
          key={site.id}
          href={site.publicPath || '#'}
          {...BLOG_NEW_TAB_PROPS}
          className={cn(className, linkClassName)}
          onClick={onClick}
        >
          <FileCodeIcon className="size-3.5 opacity-70" />
          <span className="truncate">{site.navLabel || site.title}</span>
        </a>
      ))}
    </>
  )
}
