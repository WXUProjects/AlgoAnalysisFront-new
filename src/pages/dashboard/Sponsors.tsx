import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  HeartHandshakeIcon,
  ReceiptTextIcon,
  SlidersHorizontalIcon,
  TrendingDownIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'
import {
  adjustBalance,
  getMonthlyRows,
  getSponsorOverview,
  getSponsorSettings,
  listDonations,
  listExpenses,
  recordExpense,
  updateSponsorSettings,
  type Donation,
  type Expense,
  type MonthlyRow,
  type SponsorOverview,
} from '@/api/sponsor'
import { useAuth } from '@/auth/AuthContext'
import { MarkdownBody } from '@/components/markdown-body'
import { PageShell } from '@/components/page-shell'
import { Pagination } from '@/components/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

function fmtMoney(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10)
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  danger,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  danger?: boolean
}) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p
          className={cn(
            'text-2xl font-semibold tabular-nums tracking-tight',
            danger && 'text-destructive',
          )}
        >
          {value}
        </p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

export function DashboardSponsors() {
  const { isSiteAdmin } = useAuth()

  const [tab, setTab] = useState<'donations' | 'expenses' | 'monthly' | 'content'>(
    'donations',
  )
  const [overview, setOverview] = useState<SponsorOverview | null>(null)
  const [monthly, setMonthly] = useState<MonthlyRow[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [keywordDraft, setKeywordDraft] = useState('')
  const [loading, setLoading] = useState(true)

  const [expenseOpen, setExpenseOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [amountYuan, setAmountYuan] = useState('')
  const [note, setNote] = useState('')
  const [spentDate, setSpentDate] = useState(todayYmd())
  const [saving, setSaving] = useState(false)
  const [introDraft, setIntroDraft] = useState('')
  const [contentSaving, setContentSaving] = useState(false)

  const loadStats = useCallback(async () => {
    const [ov, mo, ex] = await Promise.all([
      getSponsorOverview(),
      getMonthlyRows(6),
      listExpenses(),
    ])
    if (ov.success && ov.data) setOverview(ov.data)
    if (mo.success && mo.data) setMonthly(mo.data)
    if (ex.success && ex.data) setExpenses(ex.data)
  }, [])

  const loadDonations = useCallback(async () => {
    setLoading(true)
    const res = await listDonations(page, PAGE_SIZE, keyword)
    setLoading(false)
    if (res.success && res.data) {
      setDonations(res.data.list)
      setTotal(res.data.total)
    }
  }, [page, keyword])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  useEffect(() => {
    void loadDonations()
  }, [loadDonations])

  useEffect(() => {
    let cancelled = false
    void getSponsorSettings().then((res) => {
      if (!cancelled && res.success && res.data) {
        setIntroDraft(res.data.introMarkdown)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSaveContent() {
    setContentSaving(true)
    const res = await updateSponsorSettings({ introMarkdown: introDraft })
    setContentSaving(false)
    if (res.success) toast.success('已保存')
    else toast.error(res.message || '保存失败')
  }

  function resetForm() {
    setAmountYuan('')
    setNote('')
    setSpentDate(todayYmd())
  }

  async function handleRecordExpense() {
    const cents = Math.round(Number(amountYuan) * 100)
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error('请填写正确的金额')
      return
    }
    if (!note.trim()) {
      toast.error('请填写开支说明')
      return
    }
    setSaving(true)
    const res = await recordExpense(cents, note, spentDate)
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '保存失败')
      return
    }
    toast.success('已记录开支')
    setExpenseOpen(false)
    resetForm()
    void loadStats()
  }

  async function handleAdjust() {
    const cents = Math.round(Number(amountYuan) * 100)
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error('请填写正确的金额')
      return
    }
    if (!note.trim()) {
      toast.error('请填写扣减说明')
      return
    }
    setSaving(true)
    const res = await adjustBalance(cents, note)
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '保存失败')
      return
    }
    toast.success('已扣减可用金额')
    setAdjustOpen(false)
    resetForm()
    void loadStats()
  }

  if (!isSiteAdmin) {
    return (
      <PageShell>
        <Card className="mx-auto w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>没有访问权限</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            打赏管理只有站点管理员可以打开。
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell className="gap-5">
      {/* 概览 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {!overview ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))
        ) : (
          <>
            <StatCard
              icon={WalletIcon}
              label="当前可用金额"
              value={fmtMoney(overview.balanceCents)}
              danger={overview.balanceCents < 0}
            />
            <StatCard
              icon={HeartHandshakeIcon}
              label="累计赞助"
              value={fmtMoney(overview.totalIncomeCents)}
              hint={`共 ${overview.donationCount} 人次`}
            />
            <StatCard
              icon={ReceiptTextIcon}
              label="累计开支"
              value={fmtMoney(overview.totalExpenseCents)}
            />
            <StatCard
              icon={TrendingDownIcon}
              label="本月结余"
              value={fmtMoney(overview.monthIncomeCents - overview.monthExpenseCents)}
              hint={overview.loss ? '本月处于亏本状态' : '本月已覆盖开支'}
              danger={overview.loss}
            />
          </>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="donations">赞助记录</TabsTrigger>
          <TabsTrigger value="expenses">开支记录</TabsTrigger>
          <TabsTrigger value="monthly">月度收支</TabsTrigger>
          <TabsTrigger value="content">页面内容</TabsTrigger>
        </TabsList>

        {/* 赞助记录 */}
        <TabsContent value="donations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UsersIcon className="size-4 text-muted-foreground" />
                赞助记录
                <Badge variant="outline" className="font-normal">
                  {total}
                </Badge>
              </CardTitle>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  setKeyword(keywordDraft.trim())
                  setPage(1)
                }}
              >
                <Input
                  placeholder="搜索昵称 / 留言"
                  value={keywordDraft}
                  onChange={(e) => setKeywordDraft(e.target.value)}
                  className="max-w-xs"
                />
                <Button type="submit" variant="outline" size="sm">
                  搜索
                </Button>
              </form>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>昵称</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                      <TableHead>留言</TableHead>
                      <TableHead className="text-right">时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donations.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          暂无赞助记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      donations.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-sm">{d.nickname}</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">
                            {fmtMoney(d.amountCents)}
                          </TableCell>
                          <TableCell className="max-w-64 truncate text-sm text-muted-foreground">
                            {d.message || '—'}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                            {formatTime(d.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onChange={setPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 开支记录 */}
        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <ReceiptTextIcon className="size-4 text-muted-foreground" />
                开支记录
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setAdjustOpen(true)
                  }}
                >
                  <SlidersHorizontalIcon data-icon="inline-start" />
                  扣减可用金额
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    resetForm()
                    setExpenseOpen(true)
                  }}
                >
                  <ReceiptTextIcon data-icon="inline-start" />
                  记录开支
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>说明</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead className="text-right">日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        暂无开支记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.note}</TableCell>
                        <TableCell>
                          <Badge variant={e.kind === 'adjust' ? 'outline' : 'secondary'}>
                            {e.kind === 'adjust' ? '余额调整' : '日常开支'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums text-destructive">
                          -{fmtMoney(e.amountCents)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                          {formatTime(e.spentAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 月度收支 */}
        <TabsContent value="monthly" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">月度收支</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>月份</TableHead>
                    <TableHead className="text-right">赞助收入</TableHead>
                    <TableHead className="text-right">当月开支</TableHead>
                    <TableHead className="text-right">结余</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="text-sm tabular-nums">{row.month}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {fmtMoney(row.incomeCents)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {fmtMoney(row.expenseCents)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right text-sm font-medium tabular-nums',
                          row.netCents < 0 && 'text-destructive',
                        )}
                      >
                        {fmtMoney(row.netCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 页面内容 */}
        <TabsContent value="content" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">打赏页说明</CardTitle>
              <p className="text-xs text-muted-foreground">
                这段内容展示在打赏页顶部，支持 Markdown。
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea
                value={introDraft}
                onChange={(e) => setIntroDraft(e.target.value)}
                rows={5}
                placeholder="支持 Markdown"
              />
              <div className="rounded-lg border p-3">
                <MarkdownBody content={introDraft} className="text-sm" />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={contentSaving}
                  onClick={() => void handleSaveContent()}
                >
                  {contentSaving ? '保存中…' : '保存'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 记录开支 */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>记录开支</DialogTitle>
            <DialogDescription>
              记录一笔支出，会同步扣减可用金额，并展示在打赏页的开支明细里。
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="expense-amount">金额（元）</FieldLabel>
              <Input
                id="expense-amount"
                type="number"
                min={0}
                step="0.01"
                value={amountYuan}
                onChange={(e) => setAmountYuan(e.target.value)}
                placeholder="如 100"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="expense-note">开支说明</FieldLabel>
              <Textarea
                id="expense-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="如 10 月云服务器续费"
                maxLength={80}
                rows={2}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="expense-date">日期</FieldLabel>
              <Input
                id="expense-date"
                type="date"
                value={spentDate}
                onChange={(e) => setSpentDate(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExpenseOpen(false)}
            >
              取消
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleRecordExpense()}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 扣减可用金额 */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>扣减可用金额</DialogTitle>
            <DialogDescription>
              直接调低可用金额，需要填写扣减说明，说明会展示在打赏页。
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="adjust-amount">扣减金额（元）</FieldLabel>
              <Input
                id="adjust-amount"
                type="number"
                min={0}
                step="0.01"
                value={amountYuan}
                onChange={(e) => setAmountYuan(e.target.value)}
                placeholder="如 20"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="adjust-note">扣减说明</FieldLabel>
              <Textarea
                id="adjust-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="如 对账调整"
                maxLength={80}
                rows={2}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdjustOpen(false)}
            >
              取消
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleAdjust()}>
              {saving ? '保存中…' : '确认扣减'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
