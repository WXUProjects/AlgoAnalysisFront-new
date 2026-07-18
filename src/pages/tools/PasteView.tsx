import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CopyIcon, CheckIcon } from 'lucide-react'
import { getPaste } from '@/api/paste'
import type { PasteInfo } from '@shared/api'
import { CodeHighlight } from '@/components/code-highlight'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentMeta } from '@/hooks/use-document-meta'
import { clipMetaText } from '@/lib/document-meta'
import { languageLabel } from '@/lib/paste-languages'
import { formatTime } from '@/lib/format'

export function PasteView() {
  const { slug = '' } = useParams()
  const [data, setData] = useState<PasteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const pasteTitle =
    data?.title?.trim() ||
    (data?.language && data.language !== 'text'
      ? `${languageLabel(data.language)} 代码片段`
      : '粘贴板分享')
  useDocumentMeta(
    data
      ? {
          title: `${pasteTitle} - GoAlgo`,
          description: clipMetaText(
            [data.language && data.language !== 'text' ? languageLabel(data.language) : '', data.content]
              .filter(Boolean)
              .join(' · ') || '粘贴板分享',
          ),
          url: `/p/${data.slug || slug}`,
          type: 'article',
          siteName: 'GoAlgo',
        }
      : error
        ? {
            title: '粘贴板 - GoAlgo',
            description: error,
            url: slug ? `/p/${slug}` : '/tools/paste',
            type: 'website',
            siteName: 'GoAlgo',
          }
        : null,
  )

  useEffect(() => {
    if (!slug) {
      setError('链接无效')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void getPaste(slug).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (!res.success || !res.data) {
        setError(res.message || '内容不存在或已过期')
        setData(null)
        return
      }
      setError('')
      setData(res.data)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  async function copyContent() {
    if (!data?.content) return
    try {
      await navigator.clipboard.writeText(data.content)
      setCopied(true)
      toast.success('已复制全文')
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('复制失败，请稍后重试')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('已复制链接')
    } catch {
      toast.error('复制失败，请稍后重试')
    }
  }

  if (loading) {
    return (
      <PageShell className="mx-auto w-full max-w-4xl gap-4 p-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    )
  }

  if (error || !data) {
    return (
      <PageShell className="mx-auto w-full max-w-lg p-6">
        <Card>
          <CardHeader>
            <CardTitle>无法打开</CardTitle>
            <CardDescription>{error || '内容不存在或已过期'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/tools/paste">去发布新内容</Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell className="mx-auto w-full max-w-4xl gap-4 p-6">
      <Card className="gap-3">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-lg">
              {data.title || '未命名粘贴'}
            </CardTitle>
            <CardDescription className="mt-1">
              {languageLabel(data.language)}
              {data.createdAt ? ` · ${formatTime(String(data.createdAt))}` : ''}
              {data.expireAt
                ? ` · 将于 ${formatTime(String(data.expireAt))} 失效`
                : ' · 不过期'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()}>
              复制链接
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => void copyContent()}>
              {copied ? (
                <CheckIcon className="size-4" />
              ) : (
                <CopyIcon className="size-4" />
              )}
              复制全文
            </Button>
            <Button type="button" size="sm" asChild>
              <Link to="/tools/paste">再发一条</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <CodeHighlight code={data.content || ''} language={data.language} />
        </CardContent>
      </Card>
    </PageShell>
  )
}
