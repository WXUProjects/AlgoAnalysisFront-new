import { useEffect, useRef, useState } from 'react'
import { BotIcon, MessageSquareTextIcon } from 'lucide-react'
import { toast } from 'sonner'
import { aiAnswer, createTicket } from '@/api/tickets'
import type { AiAnswerReference } from '@shared/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

const QUESTION_MAX = 2000
const QA_CONTENT_MAX = 10000

interface QaTurn {
  question: string
  answer: string
  references: AiAnswerReference[]
}

export interface QaChatProps {
  /** 进入会话（转人工成功 / OPEN_TICKET_EXISTS 恢复已有会话） */
  onOpenConversation: (ticketId: string) => void
}

/**
 * 智能问答：本轮对话仅存内存，不持久化。
 * - 至少完成一轮有效问答（question/answer 均非空）后才允许转人工
 * - 转人工：title = 最后一问；content = 完整 QA 序列化（不包含引用）
 */
export function QaChat({ onOpenConversation }: QaChatProps) {
  const [turns, setTurns] = useState<QaTurn[]>([])
  const [draft, setDraft] = useState('')
  const [asking, setAsking] = useState(false)
  const [handingOff, setHandingOff] = useState(false)
  const [openRef, setOpenRef] = useState<AiAnswerReference | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const handoffVisible = turns.some((t) => t.question && t.answer)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length, asking])

  async function handleAsk() {
    const q = draft.trim()
    if (!q) return
    if (q.length > QUESTION_MAX) {
      toast.error(`问题不能超过 ${QUESTION_MAX} 字`)
      return
    }
    setDraft('')
    setAsking(true)
    const res = await aiAnswer(q)
    setAsking(false)
    if (!res.success) {
      toast.error(res.message || '智能问答暂不可用，过会儿再试')
      return
    }
    setTurns((prev) => [
      ...prev,
      {
        question: q,
        answer: res.data?.answer || '',
        references: res.data?.references ?? [],
      },
    ])
  }

  function serializeQa(turnsToSerialize: QaTurn[]): string {
    return turnsToSerialize
      .map((t) => `用户：${t.question}\nQA：${t.answer}`)
      .join('\n')
  }

  async function handleHandoff() {
    if (handingOff) return
    const title = turns[turns.length - 1]?.question.trim() ?? ''
    const content = serializeQa(turns)
    if (!title) {
      toast.error('请先完成一轮问答再转人工')
      return
    }
    if (content.length > QA_CONTENT_MAX) {
      toast.error('对话内容过长，请精简后再转人工')
      return
    }
    setHandingOff(true)
    const res = await createTicket({ title, content })
    setHandingOff(false)
    if (!res.success) {
      // 已有进行中的工单：后端返回已有工单 id，无感恢复该会话
      if (res.data?.ticket?.id) {
        onOpenConversation(res.data.ticket.id)
        return
      }
      toast.error(res.message || '转人工失败，过会儿再试')
      return
    }
    if (res.data?.ticket?.id) {
      onOpenConversation(res.data.ticket.id)
    } else {
      toast.success('已转人工，请稍候')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <BotIcon className="size-5 text-primary" />
        <h1 className="text-xl font-semibold">服务</h1>
      </div>

      <Card>
        <CardContent className="flex min-h-[40vh] flex-col gap-4 p-4">
          {turns.length === 0 && !asking ? (
            <div className="flex flex-1 items-center justify-center py-12">
              <div className="max-w-md text-center">
                <MessageSquareTextIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  描述一下你遇到的问题，我先帮你智能解答；如果解决不了，可以转人工客服。
                </p>
              </div>
            </div>
          ) : (
            turns.map((t, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground whitespace-pre-wrap break-words">
                    {t.question}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl rounded-bl-sm bg-muted px-3 py-2">
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {t.answer || (t.references.length > 0 ? '为您找到以下参考资料' : '')}
                    </p>
                    {t.references.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1">
                        {t.references.map((r) => (
                          <button
                            key={r.articleId || r.title}
                            type="button"
                            className="text-left text-xs text-primary underline-offset-2 hover:underline"
                            onClick={() => setOpenRef(r)}
                          >
                            {r.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {asking && (
            <div className="flex justify-start">
              <div className="rounded-xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                思考中…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t p-3">
          <Textarea
            value={draft}
            rows={3}
            maxLength={QUESTION_MAX}
            placeholder="输入你的问题…"
            disabled={asking || handingOff}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void handleAsk()
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {handoffVisible
                ? '问题仍无法解决？可以转人工客服'
                : 'Ctrl/⌘ + Enter 提问'}
            </span>
            <div className="flex items-center gap-2">
              {handoffVisible && (
                <Button
                  variant="outline"
                  disabled={asking || handingOff}
                  onClick={() => void handleHandoff()}
                >
                  {handingOff ? '转人工中…' : '人工服务'}
                </Button>
              )}
              <Button
                size="sm"
                disabled={asking || handingOff || !draft.trim()}
                onClick={() => void handleAsk()}
              >
                {asking ? '提问中…' : '提问'}
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={openRef !== null} onOpenChange={(open) => !open && setOpenRef(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{openRef?.title}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
            {openRef?.content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
