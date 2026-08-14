import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  createTicketMessage,
  getTicket,
  getTicketMessages,
  patchTicketStatus,
} from '@/api/tickets'
import { TicketStatusBadge } from '@/pages/TicketList'
import type { Ticket, TicketMessage } from '@shared/api'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/format'

const POLL_MS = 30_000

export function TicketDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [reason, setReason] = useState('')
  const [patchBusy, setPatchBusy] = useState(false)
  const nextSeq = useRef(0)
  const lastSeq = useRef(0) // 仅用于展示层去重
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadDetail = useCallback(async () => {
    const res = await getTicket(id)
    if (!res.success) {
      toast.error(res.message || '工单加载失败')
      return false
    }
    if (res.data?.ticket) setTicket(res.data.ticket)
    return true
  }, [id])

  // 拉取增量消息（after_sequence = 已加载的最大 sequence_no）
  const loadMessages = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true)
      const res = await getTicketMessages(id, nextSeq.current)
      if (showLoading) setLoading(false)
      if (!res.success) {
        if (showLoading) toast.error(res.message || '消息加载失败')
        return
      }
      const fresh = (res.data?.list ?? []).filter(
        (m) => m.sequenceNo > lastSeq.current,
      )
      if (fresh.length > 0) {
        setMessages((prev) => [...prev, ...fresh])
        lastSeq.current = Math.max(lastSeq.current, ...fresh.map((m) => m.sequenceNo))
        if (res.data?.nextAfterSequence !== undefined) {
          nextSeq.current = res.data.nextAfterSequence
        }
      }
    },
    [id],
  )

  const refreshAll = useCallback(async () => {
    await loadDetail()
    await loadMessages()
  }, [loadDetail, loadMessages])

  // 初次加载
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessages([])
    lastSeq.current = 0
    nextSeq.current = 0
    void (async () => {
      const ok = await loadDetail()
      if (cancelled) return
      if (!ok) {
        setLoading(false)
        return
      }
      await loadMessages(true)
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [id, loadDetail, loadMessages])

  // 30s 轮询详情 + 消息增量（组件卸载清除）
  useEffect(() => {
    if (pollTimer.current) clearInterval(pollTimer.current)
    pollTimer.current = setInterval(() => {
      void refreshAll()
    }, POLL_MS)
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [refreshAll])

  // 新消息滚动到底
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function handleSend() {
    const c = draft.trim()
    if (!c) return
    setSending(true)
    const res = await createTicketMessage(id, c)
    setSending(false)
    if (!res.success) {
      toast.error(res.message || '发送失败，过会儿再试')
      return
    }
    setDraft('')
    // 清空后拉增量（含刚发的消息）
    await loadMessages()
  }

  async function handlePatchStatus(status: string) {
    setPatchBusy(true)
    const res = await patchTicketStatus(id, status, reason.trim())
    setPatchBusy(false)
    if (!res.success) {
      toast.error(res.message || '操作失败，过会儿再试')
      return
    }
    toast.success(status === 'resolved' ? '已标记为已解决' : '工单已关闭')
    setReason('')
    await refreshAll()
  }

  const canAct = ticket && (ticket.status === 'pending_agent' || ticket.status === 'pending_customer')

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {ticket?.ticketNumber ? (
                  <span className="text-muted-foreground">#{ticket.ticketNumber}</span>
                ) : null}
                <span className="truncate">{ticket?.title || '工单'}</span>
              </CardTitle>
              {ticket?.createdAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  创建于 {formatTime(ticket.createdAt)}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {ticket ? <TicketStatusBadge status={ticket.status} /> : null}
              <Button
                variant="ghost"
                size="icon"
                title="刷新"
                onClick={() => void refreshAll()}
              >
                <RefreshCwIcon className="size-4" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">对话</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {loading ? (
              <>
                <Skeleton className="h-14 w-2/3 self-start" />
                <Skeleton className="h-14 w-2/3 self-end" />
                <Skeleton className="h-14 w-1/2 self-start" />
              </>
            ) : messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                还没有消息，描述一下你的问题吧
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.senderType === 'customer'
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'flex max-w-[85%] flex-col gap-1 rounded-xl px-3 py-2 text-sm',
                      mine
                        ? 'self-end bg-primary text-primary-foreground'
                        : 'self-start bg-muted',
                    )}
                  >
                    {m.contentType === 'text' ? (
                      <span className="whitespace-pre-wrap break-words">{m.content}</span>
                    ) : (
                      <span className="text-xs opacity-70">暂不支持的消息类型</span>
                    )}
                    {m.sentAt ? (
                      <span
                        className={cn(
                          'text-[10px]',
                          mine ? 'text-primary-foreground/70' : 'text-muted-foreground',
                        )}
                      >
                        {formatTime(m.sentAt)}
                      </span>
                    ) : null}
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </CardContent>
        </Card>

        {canAct && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">状态操作</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={patchBusy}
                onClick={() => void handlePatchStatus('resolved')}
              >
                标记已解决
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={patchBusy}>
                    关闭工单
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>关闭工单</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-muted-foreground">
                      关闭原因（可选）
                    </label>
                    <Input
                      value={reason}
                      maxLength={200}
                      placeholder="例如：问题已解决"
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      disabled={patchBusy}
                      onClick={() => void handlePatchStatus('closed')}
                    >
                      {patchBusy ? '提交中…' : '确认关闭'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="flex flex-col gap-2 p-3">
            <Textarea
              value={draft}
              rows={3}
              maxLength={10000}
              placeholder="输入消息…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ctrl/⌘ + Enter 发送</span>
              <Button size="sm" disabled={sending || !draft.trim()} onClick={() => void handleSend()}>
                {sending ? '发送中…' : '发送'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

export default TicketDetail
