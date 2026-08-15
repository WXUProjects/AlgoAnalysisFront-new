import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  createTicketMessage,
  getTicket,
  getTicketMessages,
  patchTicketStatus,
} from '@/api/tickets'
import { TicketStatusBadge } from '@/components/ticket-status-badge'
import type { Ticket, TicketMessage } from '@shared/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/format'
import { refreshServiceBadge, useServiceBadge } from '@/lib/service-badge'
import {
  bindConversationRefresh,
  createRefreshQueue,
} from '@/lib/service-conversation-refresh'

const POLL_MS = 5_000

export function Conversation({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [reason, setReason] = useState('')
  const [patchBusy, setPatchBusy] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const nextSeq = useRef(0)
  const lastSeq = useRef(0) // 仅用于展示层去重
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeTicketId = useRef(ticketId)
  const queuedRefresh = useRef<() => Promise<void>>(async () => {})
  const serviceBadge = useServiceBadge()
  activeTicketId.current = ticketId

  const loadDetail = useCallback(async () => {
    const res = await getTicket(ticketId)
    if (activeTicketId.current !== ticketId) return false
    if (!res.success) {
      toast.error(res.message || '会话加载失败')
      return false
    }
    if (res.data?.ticket) setTicket(res.data.ticket)
    return true
  }, [ticketId])

  // 拉取增量消息（after_sequence = 已加载的最大 sequence_no）
  const loadMessages = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true)
      try {
        const res = await getTicketMessages(ticketId, nextSeq.current)
        if (activeTicketId.current !== ticketId) return
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
        }
        if (res.data?.nextAfterSequence !== undefined) {
          nextSeq.current = res.data.nextAfterSequence
        }
      } finally {
        if (showLoading && activeTicketId.current === ticketId) setLoading(false)
      }
    },
    [ticketId],
  )

  const refreshAll = useCallback(async () => {
    await loadDetail()
    await loadMessages()
  }, [loadDetail, loadMessages])

  // 初次加载
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setTicket(null)
    setMessages([])
    setDraft('')
    setSending(false)
    setReason('')
    setPatchBusy(false)
    setCloseOpen(false)
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
  }, [ticketId, loadDetail, loadMessages])

  // 前台每 5s 轮询详情 + 消息增量（组件卸载清除）
  useEffect(() => {
    const refresh = createRefreshQueue(refreshAll)
    queuedRefresh.current = refresh
    if (pollTimer.current) clearInterval(pollTimer.current)
    pollTimer.current = setInterval(() => {
      void refresh()
    }, POLL_MS)
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [refreshAll])

  // 回到会话或收到客服待回复标记时立即同步，5s 轮询仅作兜底。
  useEffect(
    () => bindConversationRefresh(window, document, () => void queuedRefresh.current()),
    [refreshAll],
  )

  useEffect(() => {
    if (serviceBadge.visible) void queuedRefresh.current()
  }, [serviceBadge.visible])

  // 新消息滚动到底
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function handleSend() {
    const c = draft.trim()
    if (!c) return
    const requestTicketId = ticketId
    setSending(true)
    const res = await createTicketMessage(requestTicketId, c)
    if (activeTicketId.current !== requestTicketId) return
    setSending(false)
    if (!res.success) {
      toast.error(res.message || '发送失败，过会儿再试')
      return
    }
    setDraft('')
    // 清空后拉增量（含刚发的消息）
    await queuedRefresh.current()
    void refreshServiceBadge()
  }

  async function handlePatchStatus(status: string) {
    const requestTicketId = ticketId
    setPatchBusy(true)
    const res = await patchTicketStatus(requestTicketId, status, reason.trim())
    if (activeTicketId.current !== requestTicketId) return
    setPatchBusy(false)
    if (!res.success) {
      toast.error(res.message || '操作失败，过会儿再试')
      return
    }
    toast.success(status === 'resolved' ? '已标记为已解决' : '会话已关闭')
    setReason('')
    setCloseOpen(false)
    await queuedRefresh.current()
    void refreshServiceBadge()
  }

  const canAct = ticket && (ticket.status === 'pending_agent' || ticket.status === 'pending_customer')

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {ticket?.ticketNumber ? (
                <span className="text-muted-foreground">#{ticket.ticketNumber}</span>
              ) : null}
              <span className="truncate">{ticket?.title || '会话'}</span>
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
              onClick={() => void queuedRefresh.current()}
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
            <CardTitle className="text-base">结束服务</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={patchBusy}
              onClick={() => void handlePatchStatus('resolved')}
            >
              已解决
            </Button>
            <ConfirmDialog
              open={closeOpen}
              onOpenChange={setCloseOpen}
              title="关闭服务"
              description="关闭后会话仍保留，仍可继续发送消息。确定关闭吗？"
              confirmLabel="确认关闭"
              loading={patchBusy}
              onConfirm={() => void handlePatchStatus('closed')}
            >
              <Button variant="outline" disabled={patchBusy}>
                已关闭
              </Button>
            </ConfirmDialog>
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
  )
}
