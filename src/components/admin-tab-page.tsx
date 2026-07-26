import { Suspense, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type AdminTabItem = {
  /** URL ?tab= 值；'' 表示默认页签（URL 不带参数） */
  value: string
  label: string
  /** 权限不满足时隐藏该页签（默认显示） */
  show?: boolean
  content: ReactNode
}

/**
 * 管理后台「一个入口 + 页内页签」壳：把若干原独立管理页融合进同一路由，
 * 页签状态同步到 ?tab=，旧路径通过路由重定向落到对应页签。
 * 子页自带 PageShell 与标题区，这里只负责页签条与切换。
 */
export function AdminTabPage({ tabs }: { tabs: AdminTabItem[] }) {
  const [params, setParams] = useSearchParams()
  const visible = tabs.filter((t) => t.show !== false)
  const current = params.get('tab') ?? ''
  const active = visible.find((t) => t.value === current) ?? visible[0]
  if (!active) return null

  const content = (
    <Suspense fallback={null}>{active.content}</Suspense>
  )
  // 权限只剩一个页签时不渲染页签条，退化为原单页
  if (visible.length <= 1) return content

  return (
    <div className="flex min-w-0 max-w-full flex-1 flex-col">
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <Tabs
          value={active.value}
          onValueChange={(v) => {
            const next = new URLSearchParams(params)
            if (v) next.set('tab', v)
            else next.delete('tab')
            setParams(next, { replace: true })
          }}
        >
          <TabsList>
            {visible.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {/* 子页 PageShell 自带 p-4/p-6，页签条与内容间距由其顶部内边距提供 */}
      <div className="flex min-w-0 max-w-full flex-1 flex-col [&>[data-page-shell]]:pt-3 sm:[&>[data-page-shell]]:pt-4">
        {content}
      </div>
    </div>
  )
}
