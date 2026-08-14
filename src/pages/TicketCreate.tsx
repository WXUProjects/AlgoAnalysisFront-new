import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { createTicket } from '@/api/tickets'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const TITLE_MAX = 500
const CONTENT_MAX = 10000

export function TicketCreate() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    const t = title.trim()
    const c = content.trim()
    if (!t) {
      toast.error('请填写标题')
      return
    }
    if (t.length > TITLE_MAX) {
      toast.error(`标题不能超过 ${TITLE_MAX} 字`)
      return
    }
    if (!c) {
      toast.error('请填写问题描述')
      return
    }
    if (c.length > CONTENT_MAX) {
      toast.error(`问题描述不能超过 ${CONTENT_MAX} 字`)
      return
    }
    setSubmitting(true)
    const res = await createTicket({ title: t, content: c })
    setSubmitting(false)
    if (!res.success) {
      // 已有进行中的工单：后端返回已有工单 id，直接跳详情
      if (res.data?.ticket?.id) {
        toast.warning('已有进行中的工单')
        navigate(`/tickets/${res.data.ticket.id}`, { replace: true })
        return
      }
      toast.error(res.message || '创建失败，过会儿再试')
      return
    }
    if (res.data?.ticket?.id) {
      toast.success('工单已创建')
      navigate(`/tickets/${res.data.ticket.id}`, { replace: true })
    } else {
      toast.success('工单已创建')
      navigate('/tickets', { replace: true })
    }
  }

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <h1 className="text-xl font-semibold">新建工单</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">描述你的问题</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">标题</label>
              <Input
                value={title}
                maxLength={TITLE_MAX}
                placeholder="一句话概括问题，例如：无法正常使用服务"
                onChange={(e) => setTitle(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">问题描述</label>
              <Textarea
                value={content}
                maxLength={CONTENT_MAX}
                rows={10}
                placeholder="尽量描述清楚：出现问题的操作步骤、报错信息、复现方式等"
                onChange={(e) => setContent(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">
                {content.length}/{CONTENT_MAX}
              </span>
            </div>
            <Button disabled={submitting} onClick={() => void handleSubmit()}>
              {submitting ? '提交中…' : '提交工单'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

export default TicketCreate
