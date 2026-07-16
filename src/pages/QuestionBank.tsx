import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { toast } from 'sonner'
import { listProblems, listProblemTags, type TagCountItem } from '@/api/problem'
import type { ProblemInfo } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const TAG_COLLAPSE_COUNT = 16

const PAGE_SIZE = 20
const PLATFORMS = ['NowCoder', 'AtCoder', 'CodeForces', 'LuoGu', 'LeetCode', 'QOJ']
const DIFFS = ['简单', '中等', '困难']
const STATUSES = [
  { value: '', label: '全部状态' },
  { value: 'AC', label: '已 AC' },
  { value: 'TRIED', label: '尝试过' },
  { value: 'NONE', label: '未做' },
]

function parseList(v: string | null): string[] {
  if (!v) return []
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

export function QuestionBank() {
  const { isLogin, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Number(searchParams.get('page') || 1) || 1
  const sort = 'latest_desc'
  const keyword = searchParams.get('keyword') || ''
  const platformsKey = searchParams.get('platforms') || ''
  const tagsKey = searchParams.get('tags') || ''
  const difficulty = searchParams.get('difficulty') || ''
  const userStatus = searchParams.get('userStatus') || ''
  const followingOnly = searchParams.get('following') === '1'
  const userId = isLogin && user ? user.userId : undefined

  const platforms = useMemo(() => parseList(platformsKey), [platformsKey])
  const tags = useMemo(() => parseList(tagsKey), [tagsKey])

  const [keywordInput, setKeywordInput] = useState(keyword)
  const [tagInput, setTagInput] = useState('')
  /** 中文 IME 组字中：勿响应 Enter / 勿因组字中间态打断输入 */
  const [tagComposing, setTagComposing] = useState(false)
  const [list, setList] = useState<ProblemInfo[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [allTags, setAllTags] = useState<TagCountItem[]>([])
  const [tagsExpanded, setTagsExpanded] = useState(false)

  useEffect(() => {
    setKeywordInput(keyword)
  }, [keyword])

  useEffect(() => {
    let cancelled = false
    void listProblemTags(200).then((res) => {
      if (cancelled) return
      if (res.success && res.data) setAllTags(res.data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // 有搜索词时自动展开，方便点选（组字中不触发，避免 IME 抖动）
  useEffect(() => {
    if (tagComposing) return
    if (tagInput.trim()) setTagsExpanded(true)
  }, [tagInput, tagComposing])

  const filteredTagOptions = useMemo(() => {
    // 组字过程中仍可用当前缓冲过滤；匹配用 includes，中文不 toLowerCase 丢信息
    const q = tagInput.trim()
    const qLower = q.toLowerCase()
    // 已选标签优先置顶
    const selected = allTags.filter((t) => tags.includes(t.tag))
    const rest = allTags.filter((t) => !tags.includes(t.tag))
    const ordered = [...selected, ...rest]
    if (!q) return ordered
    return ordered.filter((t) => {
      const name = t.tag
      return name.includes(q) || name.toLowerCase().includes(qLower)
    })
  }, [allTags, tagInput, tags])

  const visibleTagOptions = useMemo(() => {
    if (tagsExpanded || tagInput.trim()) return filteredTagOptions
    return filteredTagOptions.slice(0, TAG_COLLAPSE_COUNT)
  }, [filteredTagOptions, tagsExpanded, tagInput])

  const canCollapseTags =
    !tagInput.trim() && filteredTagOptions.length > TAG_COLLAPSE_COUNT

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
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

  // 关键词防抖写回 URL（仅当输入与 URL 不一致时）
  useEffect(() => {
    if (keywordInput === keyword) return
    const t = window.setTimeout(() => {
      patchParams({ keyword: keywordInput || null, page: '1' })
    }, 320)
    return () => window.clearTimeout(t)
  }, [keywordInput, keyword, patchParams])

  // 依赖用原始字符串，避免数组引用导致无限请求
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const res = await listProblems({
        page,
        pageSize: PAGE_SIZE,
        sort,
        platforms: platformsKey || undefined,
        tags: tagsKey || undefined,
        difficulty: difficulty || undefined,
        userStatus: userStatus || undefined,
        keyword: keyword || undefined,
        userId,
        followingOnly: followingOnly || undefined,
      })
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '加载题库失败')
        return
      }
      setList(res.data.data)
      setTotal(res.data.total)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [
    page,
    sort,
    platformsKey,
    tagsKey,
    difficulty,
    userStatus,
    keyword,
    userId,
    followingOnly,
  ])

  function toggleInList(key: 'platforms' | 'tags', value: string) {
    const cur = key === 'platforms' ? platforms : tags
    const next = cur.includes(value)
      ? cur.filter((x) => x !== value)
      : [...cur, value]
    patchParams({ [key]: next.join(',') || null, page: '1' })
  }

  function addTag() {
    const t = tagInput.trim()
    if (!t) return
    if (!tags.includes(t)) {
      patchParams({ tags: [...tags, t].join(','), page: '1' })
    }
    setTagInput('')
  }

  function clearFilters() {
    setKeywordInput('')
    setSearchParams({}, { replace: true })
  }

  const hasFilters = useMemo(
    () =>
      Boolean(
        keyword ||
          platforms.length ||
          tags.length ||
          difficulty ||
          userStatus ||
          followingOnly,
      ),
    [
      keyword,
      platforms.length,
      tags.length,
      difficulty,
      userStatus,
      followingOnly,
    ],
  )

  const platformLabel = (p: string) =>
    (
      {
        NowCoder: '牛客',
        AtCoder: 'AtCoder',
        CodeForces: 'Codeforces',
        LuoGu: '洛谷',
        LeetCode: '力扣',
        QOJ: 'QOJ',
      } as Record<string, string>
    )[p] || p

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">题库</h2>
          <p className="text-sm text-muted-foreground">
            按条件筛选题目，默认按最近提交排序
          </p>
        </div>
        {isLogin && (
          <Button
            type="button"
            size="sm"
            variant={followingOnly ? 'default' : 'outline'}
            onClick={() =>
              patchParams({
                following: followingOnly ? null : '1',
                page: '1',
              })
            }
          >
            {followingOnly ? '仅关注 · 开' : '仅关注'}
          </Button>
        )}
      </div>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-sm font-medium">筛选</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4">
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="搜索标题 / 题号"
          />
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={platforms.includes(p) ? 'default' : 'outline'}
                onClick={() => toggleInList('platforms', p)}
              >
                {platformLabel(p)}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DIFFS.map((d) => (
              <Button
                key={d}
                type="button"
                size="sm"
                variant={difficulty === d ? 'default' : 'outline'}
                onClick={() =>
                  patchParams({
                    difficulty: difficulty === d ? null : d,
                    page: '1',
                  })
                }
              >
                {d}
              </Button>
            ))}
          </div>
          {isLogin && (
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <Button
                  key={s.value || 'all'}
                  type="button"
                  size="sm"
                  variant={userStatus === s.value ? 'default' : 'outline'}
                  onClick={() =>
                    patchParams({ userStatus: s.value || null, page: '1' })
                  }
                >
                  {s.label}
                </Button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">标签</span>
              <Input
                className="max-w-xs"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="搜索标签 / 回车添加"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onCompositionStart={() => setTagComposing(true)}
                onCompositionEnd={(e) => {
                  setTagComposing(false)
                  // 部分浏览器 compositionend 时 value 才最终确定
                  setTagInput((e.target as HTMLInputElement).value)
                }}
                onKeyDown={(e) => {
                  // 中文 IME 组字时 Enter 是「上屏」，不能当成添加
                  if (e.key === 'Enter') {
                    if (tagComposing || e.nativeEvent.isComposing) return
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" size="sm" variant="secondary" onClick={addTag}>
                添加
              </Button>
              {canCollapseTags && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 px-2 text-muted-foreground"
                  onClick={() => setTagsExpanded((v) => !v)}
                >
                  {tagsExpanded ? (
                    <>
                      收起
                      <ChevronUpIcon className="size-3.5" />
                    </>
                  ) : (
                    <>
                      展开全部 {filteredTagOptions.length}
                      <ChevronDownIcon className="size-3.5" />
                    </>
                  )}
                </Button>
              )}
              {hasFilters && (
                <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
                  清空筛选
                </Button>
              )}
            </div>
            {visibleTagOptions.length > 0 && (
              <div
                className={cn(
                  'flex flex-wrap gap-1.5',
                  tagsExpanded && 'max-h-40 overflow-y-auto pr-1',
                )}
              >
                {visibleTagOptions.map((t) => {
                  const on = tags.includes(t.tag)
                  return (
                    <Button
                      key={t.tag}
                      type="button"
                      size="sm"
                      variant={on ? 'default' : 'outline'}
                      className={cn(
                        'h-7 px-2 text-xs',
                        on &&
                          'border-transparent bg-sky-600 text-white hover:bg-sky-600/90 dark:bg-sky-500 dark:hover:bg-sky-500/90',
                      )}
                      onClick={() => toggleInList('tags', t.tag)}
                    >
                      {t.tag}
                      <span className={cn('ml-1', on ? 'opacity-90' : 'opacity-70')}>
                        ({t.count})
                      </span>
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
          {(platforms.length > 0 || tags.length > 0 || difficulty || userStatus) && (
            <div className="flex flex-wrap gap-1.5">
              {platforms.map((p) => (
                <Badge
                  key={p}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => toggleInList('platforms', p)}
                >
                  {platformLabel(p)} ×
                </Badge>
              ))}
              {tags.map((t) => {
                const cnt = allTags.find((x) => x.tag === t)?.count
                return (
                  <Badge
                    key={t}
                    variant="default"
                    className="cursor-pointer border-transparent bg-sky-600 text-white hover:bg-sky-600/90 dark:bg-sky-500"
                    onClick={() => toggleInList('tags', t)}
                  >
                    {t}
                    {cnt != null ? ` (${cnt})` : ''} ×
                  </Badge>
                )
              })}
              {difficulty && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => patchParams({ difficulty: null, page: '1' })}
                >
                  {difficulty} ×
                </Badge>
              )}
              {userStatus && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => patchParams({ userStatus: null, page: '1' })}
                >
                  {userStatus} ×
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>题目</TableHead>
                  <TableHead className="w-28">平台</TableHead>
                  <TableHead className="w-20">难度</TableHead>
                  <TableHead className="hidden md:table-cell">标签</TableHead>
                  <TableHead className="w-24">状态</TableHead>
                  <TableHead className="w-36 hidden sm:table-cell">最近提交</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/question-bank/detail/${p.id}`)}
                  >
                    <TableCell>
                      <Link
                        to={`/question-bank/detail/${p.id}`}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.title || p.externalId}
                      </Link>
                      <div className="text-xs text-muted-foreground">{p.externalId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{platformLabel(p.platform)}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.difficulty ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            p.difficulty === '困难' &&
                              'border-transparent bg-red-500/15 text-red-700 dark:text-red-400',
                            p.difficulty === '中等' &&
                              'border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-400',
                            p.difficulty === '简单' &&
                              'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                          )}
                        >
                          {p.difficulty}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {p.tags.length ? (
                          p.tags.slice(0, 4).map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="cursor-pointer border-border/70 bg-muted/50 font-normal text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleInList('tags', t)
                              }}
                            >
                              {t}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.userStatus ? (
                        <StatusBadge status={p.userStatus} userStatus />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                      {p.lastSubmittedAt ? formatTime(p.lastSubmittedAt) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {!list.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      暂无题目
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onChange={(p) => patchParams({ page: String(p) })}
        disabled={loading}
      />
    </PageShell>
  )
}
