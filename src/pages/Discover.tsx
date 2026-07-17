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
import { FeedStream } from '@/pages/discover/FeedStream'
import { LeftRail } from '@/pages/discover/LeftRail'
import { OrgsPanel } from '@/pages/discover/OrgsPanel'
import { RecommendStream } from '@/pages/discover/RecommendStream'
import { RightSidebar } from '@/pages/discover/RightSidebar'
import { DiscoverSearchResults } from '@/pages/discover/SearchResults'
import type { FeedScope } from '@/pages/discover/types'

/**
 * Discover：推荐 / 提交动态 / 组织；排行仅右侧挂件。
 */
export function Discover() {
  const { isLogin, user, switchOrg, refreshOrgs } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = normalizeDiscoverTab(searchParams.get('tab'))
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
  const searchMode = Boolean(qParam)

  const feedScope: FeedScope = mineScope
    ? 'mine'
    : followingOnly
      ? 'following'
      : 'org'

  const [qInput, setQInput] = useState(qParam)
  const [streakDays, setStreakDays] = useState<number | null>(null)
  const [followingCount, setFollowingCount] = useState<number | null>(null)

  useEffect(() => {
    setQInput(qParam)
  }, [qParam])

  useEffect(() => {
    if (!isLogin || !user?.userId) {
      setStreakDays(null)
      setFollowingCount(null)
      return
    }
    let cancelled = false
    void getPeriod(user.userId).then((res) => {
      if (cancelled) return
      if (res.success && res.data?.ac) {
        setStreakDays(res.data.ac.thisWeek ?? 0)
      }
    })
    void getSocialCounts(user.userId).then((res) => {
      if (cancelled) return
      if (res.success && res.data) {
        setFollowingCount(res.data.followingCount)
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

  function setTab(next: DiscoverTabKey) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('tab', next)
        p.delete('q')
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

  return (
    <PageShell className="gap-5" stagger={false}>
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">发现</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            浏览推荐内容、提交动态与组织
          </p>
        </div>
        <form
          className="flex w-full max-w-sm items-center gap-2 sm:w-auto"
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

      {searchMode ? (
        <DiscoverSearchResults
          q={qParam}
          isLogin={isLogin}
          userId={user?.userId}
          onClear={clearSearch}
        />
      ) : (
        <div
          data-discover-layout=""
          className="mx-auto flex w-full max-w-[1340px] items-start justify-center gap-5"
        >
          {/* 三栏恒定：左 220 · 中 780 · 右 300；任意 Tab 不卸左右栏 */}
          <LeftRail
            feedScope={feedScope}
            onFeedScope={setFeedScope}
            isLogin={isLogin}
            streakDays={streakDays}
            followingCount={followingCount}
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
                <TabsList className="mb-4 w-full max-w-full justify-start overflow-x-auto sm:w-auto">
                  <TabsTrigger value="recommend">
                    <CompassIcon data-icon="inline-start" />
                    推荐
                  </TabsTrigger>
                  <TabsTrigger value="feed">
                    <ActivityIcon data-icon="inline-start" />
                    提交动态
                  </TabsTrigger>
                  <TabsTrigger value="orgs">
                    <Building2Icon data-icon="inline-start" />
                    组织
                  </TabsTrigger>
                </TabsList>
              )}

              <TabsContent value="recommend" className="mt-0 flex flex-col gap-4">
                <RecommendStream />
              </TabsContent>

              <TabsContent value="feed" className="mt-0 flex flex-col gap-4">
                <FeedStream
                  isLogin={isLogin}
                  userId={feedUserId}
                  userMode={userMode}
                  followingOnly={followingOnly && !mineScope}
                  feedScope={feedScope}
                  selfUserId={user?.userId}
                />
              </TabsContent>

              {!otherUserMode && (
                <TabsContent value="orgs" className="mt-0 flex flex-col gap-4">
                  <OrgsPanel
                    isLogin={isLogin}
                    switchOrg={switchOrg}
                    refreshOrgs={refreshOrgs}
                  />
                </TabsContent>
              )}
            </Tabs>
          </div>

          <RightSidebar isLogin={isLogin} selfUserId={user?.userId} />
        </div>
      )}
    </PageShell>
  )
}
