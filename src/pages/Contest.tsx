import { useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ContestCalendar } from '@/pages/ContestCalendar'
import { ContestRecords } from '@/pages/ContestRecords'

type ContestTab = 'records' | 'calendar'

/** 比赛页：比赛记录 + 比赛日历 双子 Tab */
export function Contest() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: ContestTab =
    searchParams.get('tab') === 'calendar' ? 'calendar' : 'records'

  function onTabChange(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value === 'calendar') {
      next.set('tab', 'calendar')
    } else {
      next.delete('tab')
    }
    setSearchParams(next, { replace: true })
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">比赛</h2>
        <p className="text-sm text-muted-foreground">
          查看参赛记录，或订阅公开赛程邮件提醒
        </p>
      </div>

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="records">比赛记录</TabsTrigger>
          <TabsTrigger value="calendar">比赛日历</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4">
          <ContestRecords />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <ContestCalendar />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
