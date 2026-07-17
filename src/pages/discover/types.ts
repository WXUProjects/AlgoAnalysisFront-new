import type { ActivityFeedItem, SubmitLogItem } from '@shared/api'
import type { UnifiedFeedKind } from '@/lib/discover-feed'

/** Unified stream item for Feed / Recommend virtual lists */
export type DiscoverStreamItem = {
  uid: string
  kind: UnifiedFeedKind
  timeSec: number
  authorId: number
  authorName: string
  authorUsername?: string
  authorAvatar?: string
  actionLabel: string
  title: string
  body: string
  /** Submit-only extras */
  submit?: SubmitLogItem
  /** Community activity extras */
  activity?: ActivityFeedItem
  /** Direct navigation (e.g. blog article) when no problem detail */
  href?: string
}

export type FeedScope = 'org' | 'following' | 'mine'

export type PreviewTarget =
  | { type: 'submit'; item: DiscoverStreamItem }
  | { type: 'activity'; item: DiscoverStreamItem }
  | { type: 'comments'; item: DiscoverStreamItem }
