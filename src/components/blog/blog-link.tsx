import type { ComponentProps, MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { BLOG_NEW_TAB_PROPS, openBlogInNewTab } from '@/lib/blog-nav'
import { cn } from '@/lib/utils'

type BlogLinkProps = ComponentProps<typeof Link> & {
  /** Force same-tab (rare; default always new tab for blog entry) */
  sameTab?: boolean
}

/**
 * Link into a personal blog page — opens in a new browser tab by default.
 * Use for main-site → blog, plaza → blog, manage entry from reading shell, etc.
 */
export function BlogLink({
  sameTab,
  className,
  onClick,
  target,
  rel,
  ...props
}: BlogLinkProps) {
  if (sameTab) {
    return <Link className={className} onClick={onClick} {...props} />
  }
  return (
    <Link
      className={cn(className)}
      {...BLOG_NEW_TAB_PROPS}
      target={target ?? BLOG_NEW_TAB_PROPS.target}
      rel={rel ?? BLOG_NEW_TAB_PROPS.rel}
      onClick={onClick}
      {...props}
    />
  )
}

/** Button-like: open manage / blog URL in new tab without SPA navigation. */
export function openBlogManage(username: string, subpath = '') {
  const path = `/blog/${username}/manage${subpath ? `/${subpath.replace(/^\//, '')}` : ''}`
  openBlogInNewTab(path)
}

export function blogManageHref(username: string, subpath = '') {
  const rest = subpath ? `/${subpath.replace(/^\//, '')}` : ''
  return `/blog/${username}/manage${rest}`
}

/** Prevent React Router capture; open path in new tab. */
export function handleBlogNewTabClick(
  e: MouseEvent,
  path: string,
) {
  // allow modified clicks to behave normally
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
  e.preventDefault()
  openBlogInNewTab(path)
}
