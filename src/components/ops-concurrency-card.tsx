import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getSiteAdminConfig, updateSiteConfig } from '@/api/site'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

type Props = { canWrite: boolean }

export function OpsConcurrencyCard({ canWrite }: Props) {
  const [spider, setSpider] = useState('4')
  const [analyze, setAnalyze] = useState('4')
  const [version, setVersion] = useState(0)
  const [saved, setSaved] = useState('4:4')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await getSiteAdminConfig()
    setLoading(false)
    if (!res.success || !res.data) {
      toast.error(res.message || '并发设置加载失败')
      return
    }
    const nextSpider = String(res.data.spiderConcurrency)
    const nextAnalyze = String(res.data.problemAnalyzeConcurrency)
    setSpider(nextSpider)
    setAnalyze(nextAnalyze)
    setSaved(`${nextSpider}:${nextAnalyze}`)
    setVersion(res.data.configVersion)
  }

  useEffect(() => { void load() }, [])

  async function save() {
    const spiderConcurrency = Number(spider)
    const problemAnalyzeConcurrency = Number(analyze)
    if (![spiderConcurrency, problemAnalyzeConcurrency].every((value) => Number.isInteger(value) && value >= 1 && value <= 32)) {
      toast.error('并发数须为 1 到 32 的整数')
      return
    }
    setSaving(true)
    const res = await updateSiteConfig({
      section: 'ops',
      expectedConfigVersion: version,
      spiderConcurrency,
      problemAnalyzeConcurrency,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.message || '并发设置保存失败')
      return
    }
    toast.success('并发设置已保存')
    await load()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">运行并发</CardTitle>
        <CardDescription>调整同步和题库分析同时执行的任务数</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-16 w-full" /> : (
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="spider-concurrency">OJ 提交同步</FieldLabel>
               <Input id="spider-concurrency" type="number" min={1} max={32} step={1} value={spider} disabled={!canWrite || saving} onChange={(event) => setSpider(event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="problem-analyze-concurrency">题库 AI 分析</FieldLabel>
               <Input id="problem-analyze-concurrency" type="number" min={1} max={32} step={1} value={analyze} disabled={!canWrite || saving} onChange={(event) => setAnalyze(event.target.value)} />
            </Field>
          </FieldGroup>
        )}
      </CardContent>
      {canWrite ? (
        <CardFooter>
          <Button type="button" size="sm" disabled={loading || saving || `${spider}:${analyze}` === saved} onClick={() => void save()}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
}
