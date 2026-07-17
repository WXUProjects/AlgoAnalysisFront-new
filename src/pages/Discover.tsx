import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ActivityIcon,
  Building2Icon,
  CompassIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'
import { getPeriod } from '@/api/statistic'
import { getSocialCounts } from '@/api/social'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  normalizeDiscoverTab,
  type DiscoverTabKey,
} from '@/lib/discover-feed'
import { DiscoverContestPage } from '@/pages/discover/DiscoverContestPage'
import { DiscoverDataPage } from '@/pages/discover/DiscoverDataPage'
import { DiscoverHotPage } from '@/pages/discover/DiscoverHotPage'
import { DiscoverMobileDock } from '@/pages/discover/DiscoverMobileDock'
import { DiscoverRankPage } from '@/pages/discover/DiscoverRankPage'
import { FeedScopeBar } from '@/pages/discover/FeedScopeBar'
import { FeedStream } from '@/pages/discover/FeedStream'
import { LeftRail } from '@/pages/discover/LeftRail'
import {
  DISCOVER_MOBILE_VIEW_LABEL,
  normalizeDiscoverMobileView,
  type DiscoverMobileView,
} from '@/pages/discover/mobile-view'
import { OrgsPanel } from '@/pages/discover/OrgsPanel'
import { RecommendStream } from '@/pages/discover/RecommendStream'
import { RightSidebar } from '@/pages/discover/RightSidebar'
import { DiscoverSearchResults } from '@/pages/discover/SearchResults'
import type { FeedScope } from '@/pages/discover/types'
import type { PeriodData } from '@shared/api'

const VIEW_SUBTITLE: Record<DiscoverMobileView, string> = {
  feed: '浏览推荐内容、提交动态与组织',
  data: '刷题进度、热力图与能力画像',
  hot: '近两天全站热门题目',
  rank: '全站 AC / 提交排行',
  contest: '即将开始的比赛',
}

/**
 * Discover：桌面三栏；移动端底栏切换全屏子页（发现/数据/热题/排行/赛事）。
 */
export function Discover() {
  const { isLogin, user, switchOrg, refreshOrgs } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = normalizeDiscoverTab(searchParams.get('tab'))
  const mobileView = normalizeDiscoverMobileView(searchParams.get('view'))
  const idParam = searchParams.get('id')
  const followingOnly = searchParams.get('following') === '1'
  /** 提交范围「我的」用 mine=1，避免写成 id= 后被当成「查看他人」隐藏范围切换 */
  const mineOnly = searchParams.get('mine') === '1'
  const qParam = (searchParams.get('q') || '').trim()
  const idNum = idParam ? Number(idParam) : 0
  /** 仅当 id 指向他人时进入「单用户动态」；id=自己兼容为 mine */
  const otherUserMode =
    idNum > 0 && (!user || idNum !== user.userId)
  const selfViaId = Boolean(user && idNum > 0 && idNum === user.userId)
  const mineScope = mineOnly || selfViaId
  /** 拉取用：我的 / 指定用户 → 具体 userId；组织/关注 → -1 */
  const feedUserId = otherUserMode
    ? idNum
    : mineScope && user
      ? user.userId
      : -1
  const userMode = feedUserId > 0

  const feedScope: FeedScope = mineScope
    ? 'mine'
    : followingOnly
      ? 'following'
      : 'org'

  const [qInput, setQInput] = useState(qParam)
  const [period, setPeriod] = useState<PeriodData | null>(null)
  const [followingCount, setFollowingCount] = useState<number | null>(null)
  const [followerCount, setFollowerCount] = useState<number | null>(null)

  useEffect(() => {
    setQInput(qParam)
  }, [qParam])

  useEffect(() => {
    if (!isLogin || !user?.userId) {
      setPeriod(null)
      setFollowingCount(null)
      setFollowerCount(null)
      return
    }
    let cancelled = false
    const emptyPeriod: PeriodData = {
      ac: {
        today: 0,
        thisWeek: 0,
        lastWeek: 0,
        thisMonth: 0,
        lastMonth: 0,
        thisYear: 0,
        lastYear: 0,
        total: 0,
        totalRaw: 0,
      },
      submit: {
        today: 0,
        thisWeek: 0,
        lastWeek: 0,
        thisMonth: 0,
        lastMonth: 0,
        thisYear: 0,
        lastYear: 0,
        total: 0,
      },
    }
    void getPeriod(user.userId).then((res) => {
      if (cancelled) return
      setPeriod(res.success && res.data ? res.data : emptyPeriod)
    })
    void getSocialCounts(user.userId).then((res) => {
      if (cancelled) return
      if (res.success && res.data) {
        setFollowingCount(res.data.followingCount)
        setFollowerCount(res.data.followerCount)
      } else {
        setFollowingCount(0)
        setFollowerCount(0)
      }
    })
    return () => {
      cancelled = true
    }
  }, [isLogin, user?.userId])

  function clearFeedScopeParams(p: URLSearchParams) {
    p.delete('id')
    p.delete('following')
    p.delete('mine')
    p.delete('chip')
  }

  function setMobileView(next: DiscoverMobileView) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'feed') {
          p.delete('view')
        } else {
          p.set('view', next)
          p.delete('q')
          p.delete('upage')
          p.delete('upageSize')
        }
        return p
      },
      { replace: true },
    )
    // 切页后滚回顶部，更像独立页面
    window.scrollTo(0, 0)
  }

  function setTab(next: DiscoverTabKey) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('tab', next)
        p.delete('q')
        p.delete('view')
        if (next !== 'feed') {
          clearFeedScopeParams(p)
        }
        return p
      },
      { replace: true },
    )
  }

  function setFeedScope(scope: FeedScope) {
    if (scope === 'org') {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('tab', 'feed')
          p.delete('view')
          clearFeedScopeParams(p)
          return p
        },
        { replace: true },
      )
      return
    }
    if (scope === 'following') {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('tab', 'feed')
          p.delete('view')
          clearFeedScopeParams(p)
          p.set('following', '1')
          return p
        },
        { replace: true },
      )
      return
    }
    if (scope === 'mine' && user) {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('tab', 'feed')
          p.delete('view')
          clearFeedScopeParams(p)
          p.set('mine', '1')
          return p
        },
        { replace: true },
      )
    }
  }

  function submitSearch(e?: FormEvent) {
    e?.preventDefault()
    const next = qInput.trim()
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('view')
        if (next) {
          p.set('q', next)
          p.delete('id')
          p.delete('following')
          p.delete('mine')
          p.delete('upage')
        } else {
          p.delete('q')
        }
        return p
      },
      { replace: true },
    )
  }

  function clearSearch() {
    setQInput('')
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('q')
        p.delete('upage')
        p.delete('upageSize')
        return p
      },
      { replace: true },
    )
  }

  /** 查看他人动态时锁定 feed；「我的」不锁，保留顶部 Tab 与提交范围 */
  const activeTab: DiscoverTabKey = otherUserMode ? 'feed' : tab
  const showFeedScope = activeTab === 'feed' && !otherUserMode

  const headerTitle =
    mobileView === 'feed'
      ? '发现'
      : DISCOVER_MOBILE_VIEW_LABEL[mobileView]

  return (
    <PageShell className="gap-3" stagger={false}>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">
            <span className="lg:hidden">{headerTitle}</span>
            <span className="hidden lg:inline">发现</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            <span className="lg:hidden">{VIEW_SUBTITLE[mobileView]}</span>
            <span className="hidden lg:inline">
              浏览推荐内容、提交动态与组织
            </span>
          </p>
        </div>
        {/* 搜人：桌面始终显示；移动端仅在「发现」流 */}
        <form
          className={`w-full max-w-sm items-center gap-2 sm:w-auto ${
            mobileView === 'feed' ? 'flex' : 'hidden lg:flex'
          }`}
          onSubmit={submitSearch}
        >
          <div className="relative min-w-0 flex-1 sm:w-56">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pr-8 pl-8"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="搜索用户…"
              aria-label="搜索"
            />
            {qInput ? (
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="清空"
                onClick={clearSearch}
              >
                <XIcon className="size-3.5" />
              </button>
            ) : null}
          </div>
          <Button type="submit" variant="outline" size="icon" aria-label="搜索">
            <SearchIcon />
          </Button>
        </form>
      </section>

      {/*
        桌面：始终主信息流三栏（忽略 view）。
        移动：view=feed 时主信息流；其它 view 全屏子页。
        用 CSS 切换，避免双挂载导致 Feed 请求翻倍。
      */}
      <div className={mobileView === 'feed' ? 'contents' : 'hidden lg:contents'}>
        {qParam ? (
          <DiscoverSearchResults
            q={qParam}
            isLogin={isLogin}
            userId={user?.userId}
            onClear={clearSearch}
          />
        ) : (
          <DiscoverFeedLayout
            feedScope={feedScope}
            setFeedScope={setFeedScope}
            isLogin={isLogin}
            period={period}
            followingCount={followingCount}
            followerCount={followerCount}
            showFeedScope={showFeedScope}
            activeTab={activeTab}
            setTab={setTab}
            otherUserMode={otherUserMode}
            feedUserId={feedUserId}
            userMode={userMode}
            followingOnly={followingOnly}
            mineScope={mineScope}
            selfUserId={user?.userId}
            switchOrg={switchOrg}
            refreshOrgs={refreshOrgs}
          />
        )}
      </div>

      <div className="lg:hidden">
        {mobileView === 'data' ? (
          <DiscoverDataPage isLogin={isLogin} userId={user?.userId} />
        ) : null}
        {mobileView === 'hot' ? <DiscoverHotPage /> : null}
        {mobileView === 'rank' ? <DiscoverRankPage /> : null}
        {mobileView === 'contest' ? <DiscoverContestPage /> : null}
      </div>

      <DiscoverMobileDock view={mobileView} onViewChange={setMobileView} />
    </PageShell>
  )
}

type FeedLayoutProps = {
  feedScope: FeedScope
  setFeedScope: (s: FeedScope) => void
  isLogin: boolean
  period: PeriodData | null
  followingCount: number | null
  followerCount: number | null
  showFeedScope: boolean
  activeTab: DiscoverTabKey
  setTab: (t: DiscoverTabKey) => void
  otherUserMode: boolean
  feedUserId: number
  userMode: boolean
  followingOnly: boolean
  mineScope: boolean
  selfUserId?: number
  switchOrg: (orgId: number) => Promise<{ success: boolean; message: string }>
  refreshOrgs: () => Promise<void>
}

function DiscoverFeedLayout({
  feedScope,
  setFeedScope,
  isLogin,
  period,
  followingCount,
  followerCount,
  showFeedScope,
  activeTab,
  setTab,
  otherUserMode,
  feedUserId,
  userMode,
  followingOnly,
  mineScope,
  selfUserId,
  switchOrg,
  refreshOrgs,
}: FeedLayoutProps) {
  return (
    <div
      data-discover-layout=""
      className="mx-auto flex w-full max-w-[1340px] flex-col gap-3 lg:flex-row lg:items-start lg:justify-center lg:gap-4"
    >
      <LeftRail
        feedScope={feedScope}
        onFeedScope={setFeedScope}
        isLogin={isLogin}
        period={period}
        followingCount={followingCount}
        followerCount={followerCount}
        showFeedScope={showFeedScope}
      />

      <div
        data-discover-center-column=""
        className="min-w-0 w-full max-w-[780px] flex-1 lg:w-[780px] lg:max-w-[780px] lg:flex-none"
      >
        <Tabs
          value={activeTab}
          onValueChange={(v) => setTab(normalizeDiscoverTab(v))}
        >
          {!otherUserMode && (
            <TabsList className="mb-2.5 h-8 w-full max-w-full justify-start overflow-x-auto sm:w-auto">
              <TabsTrigger value="recommend" className="text-xs sm:text-sm">
                <CompassIcon data-icon="inline-start" />
                推荐
              </TabsTrigger>
              <TabsTrigger value="feed" className="text-xs sm:text-sm">
                <ActivityIcon data-icon="inline-start" />
                提交动态
              </TabsTrigger>
              <TabsTrigger value="orgs" className="text-xs sm:text-sm">
                <Building2Icon data-icon="inline-start" />
                组织
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="recommend" className="mt-0 flex flex-col gap-2.5">
            <RecommendStream />
          </TabsContent>

          <TabsContent value="feed" className="mt-0 flex flex-col gap-2.5">
            {showFeedScope ? (
              <div className="lg:hidden">
                <FeedScopeBar
                  variant="chips"
                  feedScope={feedScope}
                  onFeedScope={setFeedScope}
                  isLogin={isLogin}
                />
              </div>
            ) : null}
            <FeedStream
              isLogin={isLogin}
              userId={feedUserId}
              userMode={userMode}
              followingOnly={followingOnly && !mineScope}
              feedScope={feedScope}
              selfUserId={selfUserId}
            />
          </TabsContent>

          {!otherUserMode && (
            <TabsContent value="orgs" className="mt-0 flex flex-col gap-2.5">
              <OrgsPanel
                isLogin={isLogin}
                switchOrg={switchOrg}
                refreshOrgs={refreshOrgs}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <RightSidebar />
    </div>
  )
}
