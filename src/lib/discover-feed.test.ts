/**
 * Unit tests for Discover pure helpers.
 * Run: npx tsx --test src/lib/discover-feed.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  shouldCollapseContent,
  excerptContent,
  mergeCursorPage,
  filterFeedByChip,
  normalizeDiscoverTab,
  normalizeFeedChip,
  formatRelativeTime,
  toTimeSec,
  canLoadFeedStream,
  computeFeedHasMore,
  pageHasMore,
  activityPageHasMore,
  type FeedChipKey,
} from './discover-feed.ts'

describe('shouldCollapseContent / excerptContent', () => {
  it('keeps short content open', () => {
    const short = 'line1\nline2\nline3'
    assert.equal(shouldCollapseContent(short, 6), false)
    const ex = excerptContent(short, 6)
    assert.equal(ex.collapsed, false)
    assert.equal(ex.preview, short)
  })

  it('collapses content over 6 lines', () => {
    const long = Array.from({ length: 8 }, (_, i) => `L${i + 1}`).join('\n')
    assert.equal(shouldCollapseContent(long, 6), true)
    const ex = excerptContent(long, 6)
    assert.equal(ex.collapsed, true)
    assert.equal(ex.preview.split('\n').length, 6)
    assert.equal(ex.totalLines, 8)
    assert.ok(ex.preview.startsWith('L1'))
    assert.ok(ex.preview.endsWith('L6'))
  })

  it('collapses long code fence blocks', () => {
    const code =
      'intro\n```cpp\n' +
      Array.from({ length: 10 }, (_, i) => `int a${i};`).join('\n') +
      '\n```'
    assert.equal(shouldCollapseContent(code, 6), true)
  })
})

describe('mergeCursorPage', () => {
  it('appends without duplicate ids', () => {
    const prev = [
      { id: 1, t: 'a' },
      { id: 2, t: 'b' },
    ]
    const next = [
      { id: 2, t: 'b-dup' },
      { id: 3, t: 'c' },
      { id: 4, t: 'd' },
    ]
    const merged = mergeCursorPage(prev, next, (x) => x.id)
    assert.deepEqual(
      merged.map((x) => x.id),
      [1, 2, 3, 4],
    )
    assert.equal(merged[1].t, 'b') // keep first occurrence
  })

  it('uses uid when present', () => {
    const prev = [{ uid: 's-1' }, { uid: 's-2' }]
    const next = [{ uid: 's-2' }, { uid: 's-3' }]
    const merged = mergeCursorPage(prev, next)
    assert.deepEqual(
      merged.map((x) => x.uid),
      ['s-1', 's-2', 's-3'],
    )
  })

  it('returns prev when next is empty', () => {
    const prev = [{ id: 1 }]
    assert.equal(mergeCursorPage(prev, []), prev)
  })
})

describe('filterFeedByChip', () => {
  const items = [
    { kind: 'submit', uid: '1' },
    { kind: 'solution', uid: '2' },
    { kind: 'comment', uid: '3' },
    { kind: 'share', uid: '4' },
  ]

  it('all keeps every item', () => {
    assert.equal(filterFeedByChip(items, 'all').length, 4)
  })

  it('maps submit / solution / comment exactly', () => {
    assert.deepEqual(
      filterFeedByChip(items, 'submit').map((i) => i.uid),
      ['1'],
    )
    assert.deepEqual(
      filterFeedByChip(items, 'solution').map((i) => i.uid),
      ['2'],
    )
    assert.deepEqual(
      filterFeedByChip(items, 'comment').map((i) => i.uid),
      ['3'],
    )
  })

  it('share soft-maps to solution + share', () => {
    const keys = filterFeedByChip(items, 'share' as FeedChipKey).map((i) => i.kind)
    assert.deepEqual(keys, ['solution', 'share'])
  })
})

describe('normalizeDiscoverTab / normalizeFeedChip', () => {
  it('maps tab keys and legacy aliases', () => {
    assert.equal(normalizeDiscoverTab('feed'), 'feed')
    assert.equal(normalizeDiscoverTab('recommend'), 'recommend')
    assert.equal(normalizeDiscoverTab('rank'), 'recommend') // 排行并入推荐
    assert.equal(normalizeDiscoverTab('orgs'), 'orgs')
    assert.equal(normalizeDiscoverTab('users'), 'recommend')
    assert.equal(normalizeDiscoverTab(null), 'recommend')
  })

  it('maps chip keys with default all', () => {
    assert.equal(normalizeFeedChip('solution'), 'solution')
    assert.equal(normalizeFeedChip('nope'), 'all')
    assert.equal(normalizeFeedChip(null), 'all')
  })
})

describe('formatRelativeTime / toTimeSec', () => {
  it('parses ms and sec', () => {
    assert.equal(toTimeSec(1_700_000_000), 1_700_000_000)
    assert.equal(toTimeSec(1_700_000_000_000), 1_700_000_000)
  })

  it('formats relative strings', () => {
    const now = 1_700_000_000 * 1000
    assert.equal(formatRelativeTime(1_700_000_000 - 30, now), '刚刚')
    assert.equal(formatRelativeTime(1_700_000_000 - 120, now), '2 分钟前')
    assert.equal(formatRelativeTime(1_700_000_000 - 7200, now), '2 小时前')
  })
})

describe('canLoadFeedStream (following gate)', () => {
  it('blocks following-only when logged out', () => {
    const g = canLoadFeedStream({ followingOnly: true, isLogin: false })
    assert.equal(g.allow, false)
    if (!g.allow) assert.equal(g.reason, 'login_required_following')
  })

  it('allows following when logged in', () => {
    assert.equal(
      canLoadFeedStream({ followingOnly: true, isLogin: true }).allow,
      true,
    )
  })

  it('allows org feed without login', () => {
    assert.equal(
      canLoadFeedStream({ followingOnly: false, isLogin: false }).allow,
      true,
    )
  })
})

describe('computeFeedHasMore (chip=all exhaustion)', () => {
  it('stays true while either source has more (mixed all)', () => {
    assert.equal(
      computeFeedHasMore({
        needsSubmit: true,
        needsActivity: true,
        submitMore: false,
        activityMore: true,
        activityLoaded: true,
      }),
      true,
    )
    assert.equal(
      computeFeedHasMore({
        needsSubmit: true,
        needsActivity: true,
        submitMore: true,
        activityMore: false,
        activityLoaded: true,
      }),
      true,
    )
  })

  it('clears hasMore when both sources exhaust (chip=all)', () => {
    assert.equal(
      computeFeedHasMore({
        needsSubmit: true,
        needsActivity: true,
        submitMore: false,
        activityMore: false,
        activityLoaded: true,
      }),
      false,
    )
  })

  it('submit-only uses submitMore alone', () => {
    assert.equal(
      computeFeedHasMore({
        needsSubmit: true,
        needsActivity: false,
        submitMore: false,
        activityMore: true,
        activityLoaded: false,
      }),
      false,
    )
    assert.equal(
      computeFeedHasMore({
        needsSubmit: true,
        needsActivity: false,
        submitMore: true,
        activityMore: false,
        activityLoaded: false,
      }),
      true,
    )
  })

  it('activity-only without load is exhausted (following scope)', () => {
    assert.equal(
      computeFeedHasMore({
        needsSubmit: false,
        needsActivity: true,
        submitMore: false,
        activityMore: true,
        activityLoaded: false,
      }),
      false,
    )
  })

  it('pageHasMore / activityPageHasMore match short-page rules', () => {
    assert.equal(pageHasMore(30, 30), true)
    assert.equal(pageHasMore(10, 30), false)
    assert.equal(
      activityPageHasMore({
        listLength: 5,
        pageSize: 20,
        page: 1,
        total: 5,
      }),
      false,
    )
    assert.equal(
      activityPageHasMore({
        listLength: 20,
        pageSize: 20,
        page: 1,
        total: 100,
      }),
      true,
    )
  })
})
