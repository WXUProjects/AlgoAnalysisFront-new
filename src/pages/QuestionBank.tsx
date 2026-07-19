import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { listProblems, listProblemTags, type TagCountItem } from '@/api/problem'
import { addProblemToSet } from '@/api/problemset'
import type { ProblemInfo } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import {
  prepareSharedElement,
  sharedElementStyle,
} from '@/lib/view-transition'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Card,
  CardContent,
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
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

const DEFAULT_PAGE_SIZE = 20
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
  const pageSizeRaw = Number(searchParams.get('pageSize') || DEFAULT_PAGE_SIZE)
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
      ? Math.floor(pageSizeRaw)
      : DEFAULT_PAGE_SIZE
  const sort = 'latest_desc'
  const keyword = searchParams.get('keyword') || ''
  const platformsKey = searchParams.get('platforms') || ''
  const tagsKey = searchParams.get('tags') || ''
  const difficulty = searchParams.get('difficulty') || ''
  const userStatus = searchParams.get('userStatus') || ''
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

  // 加题
  const [addOpen, setAddOpen] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [manualPromptOpen, setManualPromptOpen] = useState(false)
  const [pendingManualUrl, setPendingManualUrl] = useState('')
  const [listVersion, setListVersion] = useState(0)

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
        pageSize,
        sort,
        platforms: platformsKey || undefined,
        tags: tagsKey || undefined,
        difficulty: difficulty || undefined,
        userStatus: userStatus || undefined,
        keyword: keyword || undefined,
        userId,
      })
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        toast.error(res.message || '题库加载失败，请稍后重试')
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
    pageSize,
    sort,
    platformsKey,
    tagsKey,
    difficulty,
    userStatus,
    keyword,
    userId,
    listVersion,
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

  async function handleAddByUrl() {
    const u = addUrl.trim()
    if (!u) {
      toast.error('请粘贴题目链接')
      return
    }
    if (!isLogin) {
      toast.error('请先登录')
      navigate('/login')
      return
    }
    setAdding(true)
    const res = await addProblemToSet({ url: u })
    setAdding(false)
    if (!res.success) {
      if (res.code === 'URL_PARSE_FAILED') {
        setPendingManualUrl(u)
        setManualPromptOpen(true)
        setAddOpen(false)
        return
      }
      toast.error(res.message || '无法识别该链接')
      return
    }
    toast.success(
      res.data?.fetchTriggered
        ? '已加入题库，正在后台拉取题面'
        : '已加入题库',
    )
    setAddUrl('')
    setAddOpen(false)
    const pid = res.data?.problemId
    if (pid) {
      navigate(`/question-bank/detail/${pid}`)
      return
    }
    setListVersion((v) => v + 1)
  }

  function goManualAdd() {
    const q = pendingManualUrl
      ? `?url=${encodeURIComponent(pendingManualUrl)}`
      : ''
    setManualPromptOpen(false)
    navigate(`/question-bank/add-problem${q}`)
  }

  const hasFilters = useMemo(
    () =>
      Boolean(
        keyword ||
          platforms.length ||
          tags.length ||
          difficulty ||
          userStatus,
      ),
    [keyword, platforms.length, tags.length, difficulty, userStatus],
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
            onClick={() => {
              setAddUrl('')
              setAddOpen(true)
            }}
          >
            <PlusIcon data-icon="inline-start" />
            加题
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
            placeholder="搜索标题或题号"
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
                placeholder="搜索标签，回车添加"
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
                    onClick={() => {
                      prepareSharedElement('problem', p.id)
                      navigate(`/question-bank/detail/${p.id}`)
                    }}
                  >
                    <TableCell>
                      <Link
                        to={`/question-bank/detail/${p.id}`}
                        className="font-medium hover:underline vt-shared"
                        style={sharedElementStyle('problem', p.id)}
                        onClick={(e) => {
                          e.stopPropagation()
                          prepareSharedElement('problem', p.id)
                        }}
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
                      没有找到题目，试试调整筛选条件
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
        pageSize={pageSize}
        onChange={(p) =>
          patchParams({
            page: p <= 1 ? null : String(p),
          })
        }
        onPageSizeChange={(size) =>
          patchParams({
            pageSize: size === DEFAULT_PAGE_SIZE ? null : String(size),
            page: null,
          })
        }
        disabled={loading}
      />

      {/* 向题库加题：粘贴链接 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>向题库加题</DialogTitle>
            <DialogDescription>
              粘贴常见 OJ 题目链接。未入库题面会自动拉取；是否做标签分析取决于你的 AI
              权限。链接无法识别时可手动填写。
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="qb-url">题目链接</FieldLabel>
              <Input
                id="qb-url"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder="https://codeforces.com/contest/… 等"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleAddByUrl()
                  }
                }}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setAddOpen(false)
                navigate('/question-bank/add-problem')
              }}
            >
              手写加题
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                取消
              </Button>
              <Button
                type="button"
                disabled={adding}
                onClick={() => void handleAddByUrl()}
              >
                {adding ? '处理中…' : '加入'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={manualPromptOpen}
        onOpenChange={(open) => {
          if (!open) {
            setManualPromptOpen(false)
            setPendingManualUrl('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>无法识别该链接</AlertDialogTitle>
            <AlertDialogDescription>
              系统无法从该链接识别题目。是否手动填写并加入题库？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                goManualAdd()
              }}
            >
              手写加题
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
