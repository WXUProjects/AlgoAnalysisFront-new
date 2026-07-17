import type { ActivityFeedItem, BlogArticle, SubmitLogItem } from '@shared/api'
import {
  activityActionLabel,
  submitActionLabel,
  toTimeSec,
} from '@/lib/discover-feed'
import { formatActivityProblemTitle } from '@/lib/activity-title'
import type { DiscoverStreamItem } from './types'

/** Map recommended blog article into discover stream (share chip). */
export function mapBlogArticleToStreamItem(a: BlogArticle): DiscoverStreamItem {
  const username = a.username || a.author?.username || ''
  const href =
    username && a.slug ? `/blog/${username}/${a.slug}` : `/blog/${username || ''}`
  return {
    uid: `blog-${a.id}`,
    kind: 'share',
    timeSec: toTimeSec(a.publishedAt || a.createdAt),
    authorId: a.userId || a.author?.id || 0,
    authorName: a.author?.name || a.author?.username || username || '作者',
    authorUsername: username || undefined,
    authorAvatar: a.author?.avatar || undefined,
    actionLabel: '发布了博客',
    title: a.title,
    body: a.summary || '',
    href,
  }
}

export function mapSubmitToStreamItem(item: SubmitLogItem): DiscoverStreamItem {
  const title = formatActivityProblemTitle(
    item.problem,
    item.problemTitle,
    item.contest,
  )
  const statusLine = item.status ? `结果：${item.status}` : ''
  const meta = [item.platform, item.lang].filter(Boolean).join(' · ')
  const tags =
    item.problemTags && item.problemTags.length
      ? `标签：${item.problemTags.slice(0, 4).join('、')}`
      : ''
  const body = [meta, statusLine, tags].filter(Boolean).join('\n')

  return {
    uid: `submit-${item.id}-${item.submitId}`,
    kind: 'submit',
    timeSec: toTimeSec(item.time),
    authorId: item.userId,
    authorName: item.userName || `用户${item.userId}`,
    actionLabel: submitActionLabel(item.status),
    title,
    body,
    submit: item,
  }
}

export function mapActivityToStreamItem(
  a: ActivityFeedItem,
): DiscoverStreamItem {
  const kind =
    a.type === 'solution' ? 'solution' : a.type === 'share' ? 'share' : 'comment'
  const title =
    a.type === 'solution' || a.type === 'share'
      ? a.title || a.problemTitle || '题解'
      : a.problemTitle
        ? `讨论 · ${a.problemTitle}`
        : a.title || '讨论'

  const body =
    a.type === 'solution' || a.type === 'share'
      ? a.excerpt || a.title || ''
      : a.excerpt || a.title || ''

  return {
    uid: `activity-${a.type}-${a.id}`,
    kind,
    timeSec: toTimeSec(a.createdAt),
    authorId: a.userId,
    authorName: a.name || a.username || `用户${a.userId}`,
    authorUsername: a.username || undefined,
    authorAvatar: a.avatar || undefined,
    actionLabel: activityActionLabel(a.type),
    title,
    body,
    activity: a,
  }
}
