import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getCurrentTicket } from '@/api/tickets'
import { QaChat } from '@/components/service/qa-chat'
import { Conversation } from '@/components/service/conversation'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { refreshServiceBadge } from '@/lib/service-badge'

type ViewState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'qa' }
  | { kind: 'conversation'; ticketId: string }

/**
 * 服务页（工单 → 服务）：
 * - 带 ?ticket= 直接进入该工单会话（含终态，供通知深链）
 * - 无则先查 current：有 active 会话进会话，否则进入智能问答
 * - QA 完成一轮后出现「人工服务」，转人工/恢复已有会话后进入会话视图
 */
export function ServicePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const ticketParam = searchParams.get('ticket')?.trim() ?? ''
  const [view, setView] = useState<ViewState>({ kind: 'loading' })
  const initializing = useRef(false)

  const loadCurrent = useCallback(async () => {
    const res = await getCurrentTicket()
    if (res.success) {
      if (res.data?.ticket?.id) {
        setView({ kind: 'conversation', ticketId: res.data.ticket.id })
      } else {
        setView({ kind: 'qa' })
      }
      void refreshServiceBadge()
    } else {
      setView({ kind: 'error', message: res.message || '服务暂时不可用，过会儿再试' })
    }
  }, [])

  useEffect(() => {
    if (ticketParam) {
      setView({ kind: 'conversation', ticketId: ticketParam })
      return
    }
    if (initializing.current) return
    initializing.current = true
    void loadCurrent()
  }, [ticketParam, loadCurrent])

  function openConversation(ticketId: string) {
    setView({ kind: 'conversation', ticketId })
    navigate(`/service?ticket=${encodeURIComponent(ticketId)}`, { replace: true })
  }

  if (view.kind === 'loading') {
    return (
      <PageShell>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </PageShell>
    )
  }

  if (view.kind === 'error') {
    return (
      <PageShell>
        <div className="mx-auto flex w-full max-w-3xl p-4">
          <Card className="w-full">
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-muted-foreground">{view.message}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setView({ kind: 'loading' })
                  void loadCurrent()
                }}
              >
                重试
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    )
  }

  if (view.kind === 'conversation') {
    return <Conversation ticketId={view.ticketId} />
  }

  return <QaChat onOpenConversation={openConversation} />
}

export default ServicePage
