import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { StatusBadge, formatSubmitStatus } from '@/components/status-badge'
import { MarkdownBody } from '@/components/markdown-body'
import { difficultyBadgeClass } from '@/lib/difficulty'
import {
  excerptContent,
  formatRelativeTime,
  shouldCollapseContent,
} from '@/lib/discover-feed'
import { isBlogPath, openBlogInNewTab } from '@/lib/blog-nav'
import { getSubmitLink } from '@/lib/link'
import { cn } from '@/lib/utils'
import type { DiscoverStreamItem, PreviewTarget } from './types'

type FeedCardProps = {
  item: DiscoverStreamItem
  onPreview: (target: PreviewTarget) => void
}

/** 题解/讨论/提交 → 详情页路径；无关联题目时返回 null */
function getDetailHref(item: DiscoverStreamItem): string | null {
  if (item.href) return item.href
  const submit = item.submit
  const activity = item.activity
  if (submit?.problemId) return `/question-bank/detail/${submit.problemId}`
  if (activity?.problemId) {
    if (item.kind === 'solution' || item.kind === 'share') {
      return `/question-bank/detail/${activity.problemId}/solution/${activity.refId}`
    }
    return `/question-bank/detail/${activity.problemId}?tab=comments`
  }
  return null
}

function previewTargetFor(item: DiscoverStreamItem): PreviewTarget {
  if (item.kind === 'submit') return { type: 'submit', item }
  if (item.kind === 'comment') return { type: 'comments', item }
  return { type: 'activity', item }
}

/** 提交/题解预览卡：信息行 + 标题 + 摘要；整卡可点进详情 */
export function FeedCard({ item, onPreview }: FeedCardProps) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const collapse = shouldCollapseContent(item.body, 4)
  const { preview } = excerptContent(item.body, 4)
  const bodyShown = expanded || !collapse ? item.body : preview

  const profileTo = item.authorUsername
    ? `/profile/${item.authorUsername}`
    : `/profile?id=${item.authorId}`

  const submit = item.submit
  const submitUrl = submit
    ? getSubmitLink(submit.platform, submit.contest, submit.submitId)
    : null
  const detailHref = getDetailHref(item)

  function openItem() {
    if (detailHref) {
      // 主站 → 个人博客：新标签页
      if (isBlogPath(detailHref)) {
        openBlogInNewTab(detailHref)
        return
      }
      navigate(detailHref)
      return
    }
    onPreview(previewTargetFor(item))
  }

  /** 点在作者/外链/按钮上不触发整卡进入 */
  function handleCardClick(e: MouseEvent<HTMLElement>) {
    const el = e.target as HTMLElement
    if (el.closest('a, button, [role="button"]')) return
    openItem()
  }

  function handleCardKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const el = e.target as HTMLElement
    if (el !== e.currentTarget) return
    e.preventDefault()
    openItem()
  }

  return (
    <article
      data-discover-card=""
      role="link"
      tabIndex={0}
      aria-label={`打开：${item.title}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={cn(
        'flex cursor-pointer flex-col gap-1 rounded-md border-b px-1 py-2.5 last:border-b-0 sm:px-1.5',
        'transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar size="sm" className="size-6">
          <AvatarImage
            src={item.authorAvatar || '/images/defaultAvatar.png'}
            alt=""
          />
          <AvatarFallback>{item.authorName.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 truncate text-xs sm:text-sm">
          <Link to={profileTo} className="font-medium hover:underline">
            {item.authorName}
          </Link>
          <span className="text-muted-foreground"> {item.actionLabel}</span>
        </div>
        <time
          className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
          dateTime={
            item.timeSec
              ? new Date(item.timeSec * 1000).toISOString()
              : undefined
          }
        >
          {formatRelativeTime(item.timeSec)}
        </time>
      </div>

      <h3 className="text-sm font-semibold leading-snug tracking-tight">
        {detailHref ? (
          <Link to={detailHref} className="hover:underline">
            {item.title}
          </Link>
        ) : (
          item.title
        )}
      </h3>

      {submit ? (
        <div className="flex flex-wrap items-center gap-1">
          {submit.problemDifficulty ? (
            <Badge
              variant="outline"
              className={cn(
                'h-4 px-1 text-[10px] font-normal',
                difficultyBadgeClass(submit.problemDifficulty),
              )}
            >
              {submit.problemDifficulty}
            </Badge>
          ) : null}
          {submitUrl ? (
            <StatusBadge status={submit.status} asChild>
              <a
                href={submitUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {formatSubmitStatus(submit.status)}
              </a>
            </StatusBadge>
          ) : (
            <StatusBadge status={submit.status} />
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="secondary" className="h-4 text-[10px] font-normal">
            {item.kind === 'solution' || item.kind === 'share' ? '题解' : '讨论'}
          </Badge>
        </div>
      )}

      {bodyShown ? (
        <div
          className={cn(
            'text-xs leading-relaxed text-muted-foreground sm:text-[13px]',
            !expanded && collapse && 'max-h-[4.5rem] overflow-hidden',
          )}
        >
          <MarkdownBody
            content={bodyShown}
            mode="markdown"
            className="text-xs leading-relaxed sm:text-[13px] [&_p]:my-1 [&_pre]:my-1.5 [&_pre]:max-h-16 [&_pre]:overflow-hidden"
            emptyText=""
          />
        </div>
      ) : null}

      {collapse ? (
        <button
          type="button"
          className="self-start text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
          onClick={() => {
            if (!expanded) {
              onPreview(previewTargetFor(item))
            }
            setExpanded((v) => !v)
          }}
        >
          {expanded ? '收起' : '展开阅读全文'}
        </button>
      ) : null}
    </article>
  )
}

export function FeedCardSkeleton() {
  return (
    <div
      data-discover-card-skeleton=""
      className="flex flex-col gap-1.5 border-b px-1 py-2.5 sm:px-1.5"
    >
      <div className="flex items-center gap-2">
        <div className="size-6 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-36 animate-pulse rounded bg-muted" />
        <div className="ml-auto h-2.5 w-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-3.5 w-3/4 max-w-md animate-pulse rounded bg-muted" />
      <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
      <div className="h-2.5 w-5/6 animate-pulse rounded bg-muted" />
    </div>
  )
}
