import { Badge } from '@/components/ui/badge'

export const TICKET_STATUS_LABEL: Record<string, string> = {
  pending_agent: '待处理',
  pending_customer: '待你回复',
  resolved: '已解决',
  closed: '已关闭',
}

export const TICKET_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'ghost'> = {
  pending_agent: 'secondary',
  pending_customer: 'default',
  resolved: 'outline',
  closed: 'ghost',
}

export function TicketStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={TICKET_STATUS_VARIANT[status] || 'outline'}>
      {TICKET_STATUS_LABEL[status] || status}
    </Badge>
  )
}
