import type { KeyboardEvent, MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { StatusBadge, formatSubmitStatus } from '@/components/status-badge'
import { MarkdownSummary } from '@/components/markdown-summary'
import { difficultyBadgeClass } from '@/lib/difficulty'
import { formatRelativeTime } from '@/lib/discover-feed'
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

/** 关联题目详情（题解/讨论标注用） */
function getProblemHref(item: DiscoverStreamItem): string | null {
  const pid =
    item.activity?.problemId ||
    item.submit?.problemId ||
    0
  return pid > 0 ? `/question-bank/detail/${pid}` : null
}

/** 平台 · 题目标题（优先 activity / submit） */
function getProblemLabel(item: DiscoverStreamItem): string | null {
  const activity = item.activity
  if (activity?.problemId) {
    const platform = activity.platform?.trim()
    const title = activity.problemTitle?.trim()
    if (platform && title) return `${platform} · ${title}`
    if (title) return title
    if (platform) return platform
  }
  const submit = item.submit
  if (submit) {
    const platform = submit.platform?.trim()
    const title =
      submit.problemTitle?.trim() ||
      submit.problem?.trim() ||
      ''
    if (platform && title) return `${platform} · ${title}`
    if (title) return title
    if (platform) return platform
  }
  return null
}

function previewTargetFor(item: DiscoverStreamItem): PreviewTarget {
  if (item.kind === 'submit') return { type: 'submit', item }
  if (item.kind === 'comment') return { type: 'comments', item }
  return { type: 'activity', item }
}

/**
 * 流卡片：信息行 + 标题 + 概述。
 * 概述渲染与博客广场一致（MarkdownSummary + line-clamp-2），紧贴标题。
 */
export function FeedCard({ item, onPreview }: FeedCardProps) {
  const navigate = useNavigate()
  const summary = item.body?.trim() || ''

  const profileTo = item.authorUsername
    ? `/profile/${item.authorUsername}`
    : `/profile?id=${item.authorId}`

  const submit = item.submit
  const submitUrl = submit
    ? getSubmitLink(submit.platform, submit.contest, submit.submitId)
    : null
  const detailHref = getDetailHref(item)
  const problemHref = getProblemHref(item)
  const problemLabel = getProblemLabel(item)
  const isSolutionLike =
    item.kind === 'solution' ||
    (item.kind === 'share' && Boolean(item.activity?.problemId))

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
        // 虚拟列表每条包在独立 wrapper 里，勿用 last:border-b-0（会误伤每一行）
        'flex cursor-pointer flex-col gap-1 border-b border-border px-4 py-3.5',
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

      {/* 标题 + 概述紧贴（对齐博客广场卡片） */}
      <div className="min-w-0 space-y-0.5">
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
              {item.href && isBlogPath(item.href)
                ? '博客'
                : isSolutionLike
                  ? '博客'
                  : '讨论'}
            </Badge>
            {/* 题解/讨论：标注平台 + 题目，点击进题库 */}
            {problemLabel && problemHref ? (
              <Badge
                variant="outline"
                className="h-4 max-w-full px-1 text-[10px] font-normal"
                asChild
              >
                <Link
                  to={problemHref}
                  className="inline-flex max-w-full items-center truncate hover:underline"
                  title={problemLabel}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="truncate">{problemLabel}</span>
                </Link>
              </Badge>
            ) : problemLabel ? (
              <Badge
                variant="outline"
                className="h-4 max-w-full px-1 text-[10px] font-normal"
                title={problemLabel}
              >
                <span className="truncate">{problemLabel}</span>
              </Badge>
            ) : null}
          </div>
        )}

        {summary ? (
          <MarkdownSummary
            content={summary}
            className="line-clamp-2 text-sm leading-snug text-muted-foreground"
          />
        ) : null}
      </div>
    </article>
  )
}

export function FeedCardSkeleton() {
  return (
    <div
      data-discover-card-skeleton=""
      className="flex flex-col gap-1.5 border-b border-border px-4 py-3.5"
    >
      <div className="flex items-center gap-2">
        <div className="size-6 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-36 animate-pulse rounded bg-muted" />
        <div className="ml-auto h-2.5 w-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-3.5 w-3/4 max-w-md animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
    </div>
  )
}
