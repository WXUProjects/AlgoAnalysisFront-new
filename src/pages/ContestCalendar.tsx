import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BellIcon,
  BellOffIcon,
  CalendarDaysIcon,
  ExternalLinkIcon,
  SearchIcon,
  Settings2Icon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  CONTEST_CALENDAR_ADVANCE_OPTIONS,
  CONTEST_CALENDAR_DEFAULT_ADVANCE,
  type ContestCalendarItem,
  type ContestCalendarPlatform,
  type ContestCalendarSub,
} from '@shared/api'
import {
  deleteContestCalendarSub,
  getMyContestCalendarSubs,
  listContestCalendar,
  listContestCalendarPlatforms,
  upsertContestCalendarSub,
} from '@/api/contest-calendar'
import { useAuth } from '@/auth/AuthContext'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  ContestMonthGrid,
  parseYmd,
  toYmd as formatYmd,
} from '@/components/contest-month-grid'
import { Pagination } from '@/components/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useListQueryState } from '@/hooks/use-list-query-state'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const DEFAULT_PAGE_SIZE = 15

type CalStatus = 'upcoming' | 'ongoing' | 'ended' | 'all'

const STATUS_OPTIONS: { value: CalStatus; label: string }[] = [
  { value: 'upcoming', label: '即将开始' },
  { value: 'ongoing', label: '进行中' },
  { value: 'ended', label: '已结束' },
  { value: 'all', label: '全部' },
]

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/** 仅侧栏选日时用：单日时间窗 */
function dayTimeRange(ymd: string): { timeFrom?: number; timeTo?: number } {
  const d = parseYmd(ymd)
  if (!d) return {}
  return {
    timeFrom: Math.floor(startOfLocalDay(d).getTime() / 1000),
    timeTo: Math.floor(endOfLocalDay(d).getTime() / 1000),
  }
}

function parseStatus(raw: string | null): CalStatus {
  if (raw === 'ongoing' || raw === 'ended' || raw === 'all' || raw === 'upcoming') {
    return raw
  }
  return 'upcoming'
}

function countdownLabel(startUnix: number, endUnix: number): string {
  const now = Math.floor(Date.now() / 1000)
  if (now >= endUnix) return '已结束'
  if (now >= startUnix) return '进行中'
  const sec = startUnix - now
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d} 天 ${h} 小时后`
  if (h > 0) return `${h} 小时 ${m} 分钟后`
  return `${m} 分钟后`
}

function advanceLabel(min: number): string {
  const hit = CONTEST_CALENDAR_ADVANCE_OPTIONS.find((o) => o.value === min)
  return hit?.label ?? `${min} 分钟`
}

function itemStartMs(item: ContestCalendarItem): number {
  const n = item.startTime
  if (!n) return 0
  return n > 1e12 ? n : n * 1000
}

function itemYmd(item: ContestCalendarItem): string {
  return formatYmd(new Date(itemStartMs(item)))
}

function monthQueryRange(year: number, monthIndex: number): {
  timeFrom: number
  timeTo: number
} {
  const from = startOfLocalDay(new Date(year, monthIndex, 1))
  from.setDate(from.getDate() - 7)
  const to = endOfLocalDay(new Date(year, monthIndex + 1, 0))
  to.setDate(to.getDate() + 7)
  return {
    timeFrom: Math.floor(from.getTime() / 1000),
    timeTo: Math.floor(to.getTime() / 1000),
  }
}

export function ContestCalendar() {
  const { isLogin } = useAuth()
  const requestId = useRef(0)
  const monthRequestId = useRef(0)
  const [searchParams, setSearchParams] = useSearchParams()

  const today = useMemo(() => startOfLocalDay(new Date()), [])
  const todayYmd = formatYmd(today)

  const { page, pageSize, setPage, setPageSize } = useListQueryState({
    pageKey: 'cpage',
    pageSizeKey: 'cpageSize',
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<ContestCalendarItem[]>([])
  const [platforms, setPlatforms] = useState<ContestCalendarPlatform[]>([])
  const [subs, setSubs] = useState<ContestCalendarSub[]>([])
  const [loading, setLoading] = useState(true)
  const [monthLoading, setMonthLoading] = useState(false)
  const [monthItems, setMonthItems] = useState<ContestCalendarItem[]>([])
  const [sideYear, setSideYear] = useState(() => new Date().getFullYear())
  const [sideMonthIndex, setSideMonthIndex] = useState(() =>
    new Date().getMonth(),
  )

  const platform = searchParams.get('cplatform') || ''
  const keyword = (searchParams.get('ckeyword') || '').trim()
  const status = parseStatus(searchParams.get('cstatus'))
  const selectedDayYmd = parseYmd(searchParams.get('cday') || '')
    ? (searchParams.get('cday') as string)
    : ''

  const [keywordInput, setKeywordInput] = useState(keyword)

  const [subDialogOpen, setSubDialogOpen] = useState(false)
  const [subTarget, setSubTarget] = useState<ContestCalendarItem | null>(null)
  const [subAdvance, setSubAdvance] = useState(CONTEST_CALENDAR_DEFAULT_ADVANCE)
  const [subSaving, setSubSaving] = useState(false)

  const [platDialogOpen, setPlatDialogOpen] = useState(false)
  const [platBusy, setPlatBusy] = useState<string | null>(null)
  /** 关闭平台订阅前二次确认 */
  const [platOffTarget, setPlatOffTarget] = useState<ContestCalendarPlatform | null>(
    null,
  )
  /** 移动端月历 Sheet */
  const [calSheetOpen, setCalSheetOpen] = useState(false)

  const { timeFrom, timeTo } = useMemo(
    () => (selectedDayYmd ? dayTimeRange(selectedDayYmd) : {}),
    [selectedDayYmd],
  )

  useEffect(() => {
    setKeywordInput(keyword)
  }, [keyword])

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          // 日历 Tab 下保持 tab=calendar
          if (!next.get('tab')) next.set('tab', 'calendar')
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === '') next.delete(k)
            else next.set(k, v)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // 关键词防抖
  useEffect(() => {
    if (keywordInput === keyword) return
    const t = window.setTimeout(() => {
      patchParams({ ckeyword: keywordInput.trim() || null, cpage: '1' })
    }, 320)
    return () => window.clearTimeout(t)
  }, [keywordInput, keyword, patchParams])

  const loadList = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    const res = await listContestCalendar({
      platform: platform || undefined,
      keyword: keyword || undefined,
      status,
      timeFrom,
      timeTo,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })
    if (id !== requestId.current) return
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '赛程加载失败，请稍后重试')
      return
    }
    setList(res.data.list)
    setTotal(res.data.total)
  }, [page, pageSize, platform, keyword, status, timeFrom, timeTo])

  /** 侧栏月历标记：按可见月拉全量，圈出有赛的日子（与列表筛选的平台/关键词对齐） */
  const loadMonthMarks = useCallback(async () => {
    const id = ++monthRequestId.current
    setMonthLoading(true)
    const range = monthQueryRange(sideYear, sideMonthIndex)
    const res = await listContestCalendar({
      platform: platform || undefined,
      keyword: keyword || undefined,
      status: 'all',
      timeFrom: range.timeFrom,
      timeTo: range.timeTo,
      limit: 200,
      offset: 0,
    })
    if (id !== monthRequestId.current) return
    setMonthLoading(false)
    if (!res.success || !res.data) {
      setMonthItems([])
      return
    }
    setMonthItems(res.data.list)
  }, [sideYear, sideMonthIndex, platform, keyword])

  const loadMeta = useCallback(async () => {
    const platRes = await listContestCalendarPlatforms()
    if (platRes.success && platRes.data) setPlatforms(platRes.data)
    if (isLogin) {
      const subRes = await getMyContestCalendarSubs()
      if (subRes.success && subRes.data) setSubs(subRes.data)
    } else {
      setSubs([])
    }
  }, [isLogin])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    void loadMonthMarks()
  }, [loadMonthMarks])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  // 从 URL 选中日时，侧栏翻到对应月
  useEffect(() => {
    if (!selectedDayYmd) return
    const d = parseYmd(selectedDayYmd)
    if (!d) return
    setSideYear(d.getFullYear())
    setSideMonthIndex(d.getMonth())
  }, [selectedDayYmd])

  const countByDay = useMemo(() => {
    const m = new Map<string, number>()
    for (const item of monthItems) {
      const ymd = itemYmd(item)
      m.set(ymd, (m.get(ymd) ?? 0) + 1)
    }
    return m
  }, [monthItems])

  function onSelectSideDay(ymd: string) {
    // 再点同一天：取消按日筛选
    if (selectedDayYmd === ymd) {
      patchParams({ cday: null, cpage: '1' })
      setCalSheetOpen(false)
      return
    }
    // 按日查看时放宽为「全部」，避免「即将开始」把当天已结束场次滤掉
    patchParams({
      cstatus: 'all',
      cday: ymd,
      cpage: '1',
    })
    setCalSheetOpen(false)
  }

  function onSidePrevMonth() {
    const d = new Date(sideYear, sideMonthIndex - 1, 1)
    setSideYear(d.getFullYear())
    setSideMonthIndex(d.getMonth())
  }

  function onSideNextMonth() {
    const d = new Date(sideYear, sideMonthIndex + 1, 1)
    setSideYear(d.getFullYear())
    setSideMonthIndex(d.getMonth())
  }

  function onSideGoToday() {
    setSideYear(today.getFullYear())
    setSideMonthIndex(today.getMonth())
    if (selectedDayYmd) {
      patchParams({ cday: null, cpage: '1' })
    }
  }

  const filterKey = `${platform}\0${keyword}\0${status}\0${selectedDayYmd}`
  const prevFilterKey = useRef(filterKey)
  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey
      setPage(1)
    }
  }, [filterKey, setPage])

  const contestSubMap = useMemo(() => {
    const m = new Map<number, ContestCalendarSub>()
    for (const s of subs) {
      if (s.scope === 'contest' && s.calendarId) m.set(s.calendarId, s)
    }
    return m
  }, [subs])

  const platformSubMap = useMemo(() => {
    const m = new Map<string, ContestCalendarSub>()
    for (const s of subs) {
      if (s.scope === 'platform' && s.platform && s.enabled) m.set(s.platform, s)
    }
    return m
  }, [subs])

  /** 本场 contest 订阅 enabled=false 视为静默，覆盖平台订阅 */
  function isItemMuted(item: ContestCalendarItem): boolean {
    const c = contestSubMap.get(item.id)
    return Boolean(c && !c.enabled)
  }

  function isItemSubscribed(item: ContestCalendarItem): boolean {
    const c = contestSubMap.get(item.id)
    if (c) return c.enabled
    const p = platformSubMap.get(item.platform)
    return Boolean(p?.enabled)
  }

  function openContestSub(item: ContestCalendarItem) {
    if (!isLogin) {
      toast.message('请先登录后再订阅')
      return
    }
    const existing = contestSubMap.get(item.id)
    setSubTarget(item)
    setSubAdvance(
      (existing?.enabled ? existing.advanceMinutes : undefined) ||
        platformSubMap.get(item.platform)?.advanceMinutes ||
        CONTEST_CALENDAR_DEFAULT_ADVANCE,
    )
    setSubDialogOpen(true)
  }

  async function saveContestSub(enabled: boolean) {
    if (!subTarget) return
    setSubSaving(true)
    const res = await upsertContestCalendarSub({
      scope: 'contest',
      calendarId: subTarget.id,
      platform: subTarget.platform,
      advanceMinutes: subAdvance,
      enabled,
    })
    setSubSaving(false)
    if (!res.success) {
      toast.error(res.message || '订阅保存失败，请稍后重试')
      return
    }
    toast.success(enabled ? '订阅成功' : '已取消本场提醒')
    setSubDialogOpen(false)
    void loadMeta()
  }

  /**
   * 取消本场提醒：
   * - 有平台覆盖时：写入 contest enabled=false 静默（覆盖平台）
   * - 仅单场：删除 contest 订阅
   */
  async function removeContestSub(item: ContestCalendarItem) {
    if (!isLogin) return
    const platformOn = Boolean(platformSubMap.get(item.platform)?.enabled)
    if (platformOn) {
      const adv =
        contestSubMap.get(item.id)?.advanceMinutes ||
        platformSubMap.get(item.platform)?.advanceMinutes ||
        CONTEST_CALENDAR_DEFAULT_ADVANCE
      const res = await upsertContestCalendarSub({
        scope: 'contest',
        calendarId: item.id,
        platform: item.platform,
        advanceMinutes: adv,
        enabled: false,
      })
      if (!res.success) {
        toast.error(res.message || '取消失败，请稍后重试')
        return
      }
      toast.success('已取消本场提醒')
      void loadMeta()
      return
    }
    const res = await deleteContestCalendarSub({
      scope: 'contest',
      calendarId: item.id,
      platform: item.platform,
    })
    if (!res.success) {
      toast.error(res.message || '取消失败，请稍后重试')
      return
    }
    toast.success('已取消本场提醒')
    void loadMeta()
  }

  async function togglePlatformSub(
    plat: ContestCalendarPlatform,
    enabled: boolean,
    advance: number,
  ) {
    if (!isLogin) {
      toast.message('请先登录后再订阅')
      return
    }
    setPlatBusy(plat.platform)
    if (!enabled) {
      const res = await deleteContestCalendarSub({
        scope: 'platform',
        platform: plat.platform,
      })
      setPlatBusy(null)
      if (!res.success) {
        toast.error(res.message || '取消失败，请稍后重试')
        return
      }
      toast.success(`已取消 ${plat.platformName} 平台订阅`)
      void loadMeta()
      return
    }
    const res = await upsertContestCalendarSub({
      scope: 'platform',
      platform: plat.platform,
      advanceMinutes: advance,
      enabled: true,
    })
    setPlatBusy(null)
    if (!res.success) {
      toast.error(res.message || '订阅失败，请稍后重试')
      return
    }
    toast.success(`已订阅 ${plat.platformName}（提前 ${advanceLabel(advance)}）`)
    void loadMeta()
  }

  function clearFilters() {
    setKeywordInput('')
    patchParams({
      ckeyword: null,
      cplatform: null,
      cstatus: null,
      cday: null,
      cpage: '1',
    })
  }

  const hasFilters = Boolean(
    keyword || platform || status !== 'upcoming' || selectedDayYmd,
  )

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold">公开赛程</h3>
            <p className="text-sm text-muted-foreground">
              聚合 AtCoder / 洛谷 / 牛客 / Codeforces / UOJ / 力扣等近期赛程，可按平台或单场邮件提醒。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasFilters && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={clearFilters}
              >
                <XIcon data-icon="inline-start" />
                清空筛选
              </Button>
            )}
            {/* 移动端：顶部打开月历板，避免滚到列表最底才看见 */}
            <Button
              type="button"
              variant={selectedDayYmd ? 'default' : 'outline'}
              size="sm"
              className="lg:hidden"
              onClick={() => setCalSheetOpen(true)}
            >
              <CalendarDaysIcon data-icon="inline-start" />
              {selectedDayYmd ? selectedDayYmd.slice(5) : '月历'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!isLogin) {
                  toast.message('请先登录后再管理订阅')
                  return
                }
                setPlatDialogOpen(true)
              }}
            >
              <Settings2Icon data-icon="inline-start" />
              平台订阅
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative max-w-md">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="搜索比赛名称"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <Button
                key={s.value}
                type="button"
                size="sm"
                variant={status === s.value ? 'default' : 'outline'}
                onClick={() =>
                  patchParams({
                    cstatus: s.value === 'upcoming' ? null : s.value,
                    cpage: '1',
                  })
                }
              >
                {s.label}
              </Button>
            ))}
            <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" />
            <Button
              type="button"
              size="sm"
              variant={platform === '' ? 'default' : 'outline'}
              onClick={() => patchParams({ cplatform: null, cpage: '1' })}
            >
              全部平台
            </Button>
            {platforms.map((p) => (
              <Button
                key={p.platform}
                type="button"
                size="sm"
                variant={platform === p.platform ? 'default' : 'outline'}
                onClick={() =>
                  patchParams({ cplatform: p.platform, cpage: '1' })
                }
              >
                {p.platformName}
                <Badge variant="secondary" className="ml-1">
                  {p.count}
                </Badge>
              </Button>
            ))}
          </div>

          {selectedDayYmd ? (
            <p className="text-xs text-muted-foreground">
              正在查看 {selectedDayYmd} 的赛程
              <Button
                type="button"
                variant="link"
                size="sm"
                className="ml-1 h-auto px-0"
                onClick={() => patchParams({ cday: null, cpage: '1' })}
              >
                取消
              </Button>
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
          <div className="min-w-0 lg:col-span-8 xl:col-span-9">
            {loading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>暂时还没有赛程</CardTitle>
                  <CardDescription>
                    {hasFilters
                      ? '当前筛选下没有比赛，试试放宽条件。赛程约每 12 小时自动更新一次。'
                      : '暂时没有可展示的赛程，稍后再来看看。赛程约每 12 小时自动更新一次。'}
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {list.map((item) => {
                  const subbed = isItemSubscribed(item)
                  const contestSub = contestSubMap.get(item.id)
                  const now = Math.floor(Date.now() / 1000)
                  const ongoing = now >= item.startTime && now < item.endTime
                  const ended = now >= item.endTime
                  return (
                    <Card key={item.id}>
                      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                        <div className="flex min-w-0 flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {item.platformName || item.platform}
                            </Badge>
                            {ongoing && <Badge>进行中</Badge>}
                            {ended && <Badge variant="outline">已结束</Badge>}
                            {subbed && (
                              <Badge variant="outline">
                                <BellIcon data-icon="inline-start" />
                                已订阅
                              </Badge>
                            )}
                            {isItemMuted(item) && (
                              <Badge variant="secondary">本场已静默</Badge>
                            )}
                          </div>
                          <CardTitle className="text-base leading-snug sm:text-lg">
                            {item.name}
                          </CardTitle>
                          <CardDescription className="flex flex-col gap-0.5">
                            <span>
                              开始 {formatTime(item.startTime)} · 结束{' '}
                              {formatTime(item.endTime)}
                            </span>
                            <span className={cn(ongoing ? 'text-primary' : '')}>
                              {countdownLabel(item.startTime, item.endTime)}
                              {contestSub?.enabled
                                ? ` · 单场提醒提前 ${advanceLabel(contestSub.advanceMinutes)}`
                                : !isItemMuted(item) &&
                                    platformSubMap.get(item.platform)?.enabled
                                  ? ` · 平台提醒提前 ${advanceLabel(platformSubMap.get(item.platform)!.advanceMinutes)}`
                                  : ''}
                            </span>
                          </CardDescription>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                          {item.url ? (
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLinkIcon data-icon="inline-start" />
                                打开
                              </a>
                            </Button>
                          ) : null}
                          {!ended &&
                            (subbed ? (
                              <ConfirmDialog
                                title="取消本场提醒？"
                                description={`确定取消「${item.name}」的邮件提醒？`}
                                confirmLabel="取消订阅"
                                onConfirm={() => void removeContestSub(item)}
                              >
                                <Button variant="secondary" size="sm">
                                  <BellOffIcon data-icon="inline-start" />
                                  取消订阅
                                </Button>
                              </ConfirmDialog>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => openContestSub(item)}
                              >
                                <BellIcon data-icon="inline-start" />
                                订阅
                              </Button>
                            ))}
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })}
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>

          {/* 大屏：右侧紧凑月历；小屏改顶部按钮 + 底部 Sheet */}
          <aside className="hidden lg:col-span-4 lg:block xl:col-span-3">
            <Card className="gap-0 py-3 lg:sticky lg:top-4">
              <CardHeader className="gap-1 px-3 pb-2 pt-0">
                <CardTitle className="text-sm font-medium">月历</CardTitle>
                <CardDescription className="text-xs">
                  点日期可只看当天赛程，再点一次取消
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-1">
                <ContestMonthGrid
                  compact
                  year={sideYear}
                  monthIndex={sideMonthIndex}
                  selectedYmd={selectedDayYmd}
                  todayYmd={todayYmd}
                  countByDay={countByDay}
                  onSelectDay={onSelectSideDay}
                  onPrevMonth={onSidePrevMonth}
                  onNextMonth={onSideNextMonth}
                  onGoToday={onSideGoToday}
                  loading={monthLoading}
                />
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <Sheet open={calSheetOpen} onOpenChange={setCalSheetOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[85vh] flex-col gap-0 overflow-y-auto rounded-t-xl p-0 lg:hidden"
        >
          <SheetHeader className="border-b px-4 py-3 text-left">
            <SheetTitle>月历</SheetTitle>
            <SheetDescription>
              点日期可只看当天赛程，再点一次取消
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 py-4">
            <ContestMonthGrid
              compact
              year={sideYear}
              monthIndex={sideMonthIndex}
              selectedYmd={selectedDayYmd}
              todayYmd={todayYmd}
              countByDay={countByDay}
              onSelectDay={onSelectSideDay}
              onPrevMonth={onSidePrevMonth}
              onNextMonth={onSideNextMonth}
              onGoToday={onSideGoToday}
              loading={monthLoading}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>订阅比赛提醒</DialogTitle>
            <DialogDescription>
              {subTarget?.name}
              <br />
              将在开赛前通过账号邮箱发送提醒（需已绑定邮箱）。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <label className="text-sm font-medium">提前多久提醒</label>
            <Select
              value={String(subAdvance)}
              onValueChange={(v) => setSubAdvance(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTEST_CALENDAR_ADVANCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialogOpen(false)}>
              取消
            </Button>
            <Button disabled={subSaving} onClick={() => void saveContestSub(true)}>
              确认订阅
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={platDialogOpen} onOpenChange={setPlatDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>平台邮件订阅</DialogTitle>
            <DialogDescription>
              订阅后该平台所有即将开始的比赛都会按设定提前量提醒。也可在列表中单独订阅单场。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {platforms.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂时还没有平台数据</p>
            ) : (
              platforms.map((p) => {
                const sub = platformSubMap.get(p.platform)
                const enabled = Boolean(sub?.enabled)
                const adv = sub?.advanceMinutes || CONTEST_CALENDAR_DEFAULT_ADVANCE
                return (
                  <Card key={p.platform}>
                    <CardContent className="flex flex-col gap-3 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{p.platformName}</span>
                          <span className="text-xs text-muted-foreground">
                            即将开始 {p.count} 场
                          </span>
                        </div>
                        <Switch
                          checked={enabled}
                          disabled={platBusy === p.platform}
                          onCheckedChange={(v) => {
                            if (!v) {
                              setPlatOffTarget(p)
                              return
                            }
                            void togglePlatformSub(p, true, adv)
                          }}
                        />
                      </div>
                      {enabled ? (
                        <Select
                          value={String(adv)}
                          onValueChange={(v) =>
                            void togglePlatformSub(p, true, Number(v))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="提前时间" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTEST_CALENDAR_ADVANCE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={String(o.value)}>
                                提前 {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={platOffTarget != null}
        onOpenChange={(o) => {
          if (!o) setPlatOffTarget(null)
        }}
        title="取消平台订阅？"
        description={
          platOffTarget
            ? `确定取消「${platOffTarget.platformName}」的全部比赛提醒？之后该平台新比赛将不再自动提醒。`
            : ''
        }
        confirmLabel="取消订阅"
        onConfirm={() => {
          if (!platOffTarget) return
          const target = platOffTarget
          const adv =
            platformSubMap.get(target.platform)?.advanceMinutes ||
            CONTEST_CALENDAR_DEFAULT_ADVANCE
          setPlatOffTarget(null)
          void togglePlatformSub(target, false, adv)
        }}
      />
    </>
  )
}
