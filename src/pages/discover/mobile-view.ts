/** 发现页移动端底栏对应的全屏子页 */
export type DiscoverMobileView =
  | 'feed'
  | 'data'
  | 'hot'
  | 'rank'
  | 'contest'

const VIEWS: DiscoverMobileView[] = [
  'feed',
  'data',
  'hot',
  'rank',
  'contest',
]

export function normalizeDiscoverMobileView(
  raw: string | null,
): DiscoverMobileView {
  if (raw && (VIEWS as string[]).includes(raw)) {
    return raw as DiscoverMobileView
  }
  return 'feed'
}

export const DISCOVER_MOBILE_VIEW_LABEL: Record<DiscoverMobileView, string> = {
  feed: '发现',
  data: '数据',
  hot: '热题',
  rank: '排行',
  contest: '赛事',
}
