import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { createPaste, listMyPastes, deletePaste } from '@/api/paste'
import type { PasteInfo } from '@shared/api'
import { useAuth } from '@/auth/AuthContext'
import { CodeEditor } from '@/components/code-editor'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageShell } from '@/components/page-shell'
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
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { detectLanguage } from '@/lib/code-hl'
import {
  PASTE_DETECT_SUBSET,
  PASTE_EXPIRES,
  PASTE_LANGUAGES,
  languageLabel,
} from '@/lib/paste-languages'
import { formatTime } from '@/lib/format'

export function PasteCreate() {
  const { isLogin, ready } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  /** 下拉选择：auto 表示持续自动识别 */
  const [language, setLanguage] = useState('auto')
  /** 自动识别出的语言（仅 language === auto 时有效） */
  const [detected, setDetected] = useState('text')
  const [expire, setExpire] = useState('1w')
  const [saving, setSaving] = useState(false)
  const [mine, setMine] = useState<PasteInfo[]>([])
  const [mineLoading, setMineLoading] = useState(false)
  const [mineError, setMineError] = useState<string | null>(null)
  /** 忽略过期的并发请求结果，避免后返回的失败把已成功列表冲掉 */
  const mineReqSeq = useRef(0)

  const resolvedLanguage = language === 'auto' ? detected : language

  const loadMine = useCallback(async () => {
    if (!ready || !isLogin) return
    const seq = ++mineReqSeq.current
    setMineLoading(true)
    setMineError(null)
    const res = await listMyPastes()
    if (seq !== mineReqSeq.current) return
    setMineLoading(false)
    if (res.success && Array.isArray(res.data)) {
      setMine(res.data)
      setMineError(null)
      return
    }
    // 失败时不要静默显示「还没有发布过，发布后会出现在这里」
    setMineError(res.message || '加载失败，请稍后重试')
  }, [ready, isLogin])

  useEffect(() => {
    void loadMine()
  }, [loadMine])

  // 切回标签页时补拉一次（鉴权刚恢复 / 上次静默失败时）
  useEffect(() => {
    if (!ready || !isLogin) return
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadMine()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [ready, isLogin, loadMine])

  useEffect(() => {
    if (language !== 'auto') return
    const sample = content.trim()
    if (sample.length < 12) {
      setDetected('text')
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      void detectLanguage(content, PASTE_DETECT_SUBSET).then((lang) => {
        if (!cancelled) setDetected(lang)
      })
    }, 280)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [content, language])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) {
      toast.error('请先粘贴要分享的内容')
      return
    }
    setSaving(true)
    let lang = resolvedLanguage
    if (language === 'auto') {
      lang = await detectLanguage(content, PASTE_DETECT_SUBSET)
      setDetected(lang)
    }
    const res = await createPaste({
      title: title.trim(),
      content,
      language: lang === 'auto' ? 'text' : lang,
      expire: expire as 'never' | '1h' | '1d' | '1w' | '1m' | '1y',
    })
    setSaving(false)
    if (!res.success || !res.data?.slug) {
      toast.error(res.message || '发布失败，请稍后重试')
      return
    }
    toast.success('已生成分享链接')
    navigate(`/p/${res.data.slug}`)
  }

  async function handleDelete(slug: string) {
    const res = await deletePaste(slug)
    if (res.success) {
      toast.success('已删除')
      void loadMine()
    } else toast.error(res.message || '删除失败，请稍后重试')
  }

  return (
    <PageShell className="mx-auto w-full max-w-3xl gap-6 p-6">
      <form onSubmit={(e) => void handleSubmit(e)}>
        <Card>
          <CardHeader>
            <CardTitle>粘贴板</CardTitle>
            <CardDescription>
              把代码、报错日志或配置贴进来，生成链接分享。支持语法高亮，可设置有效期。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>标题（可选）</FieldLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：比赛题解草稿"
                  maxLength={200}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>语言</FieldLabel>
                  <Select
                    value={language}
                    onValueChange={setLanguage}
                  >
                    <SelectTrigger className="w-full" aria-label="语言"><SelectValue /></SelectTrigger>
                    <SelectContent>
                    {PASTE_LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
                  {language === 'auto' ? (
                    <p className="text-xs text-muted-foreground">
                      已识别为 {languageLabel(detected)}
                    </p>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel>有效期</FieldLabel>
                  <Select
                    value={expire}
                    onValueChange={setExpire}
                  >
                    <SelectTrigger className="w-full" aria-label="有效期"><SelectValue /></SelectTrigger>
                    <SelectContent>
                    {PASTE_EXPIRES.map((x) => (
                      <SelectItem key={x.value} value={x.value}>
                        {x.label}
                      </SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel>内容</FieldLabel>
                <CodeEditor
                  value={content}
                  onChange={setContent}
                  language={resolvedLanguage}
                  placeholder="在此粘贴代码或文本"
                  minHeight={320}
                />
                <p className="text-xs text-muted-foreground">
                  自动识别语言，边写边高亮；Tab 缩进 2 空格，大小约不超过 512KB
                </p>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-between gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/tools">返回工具</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              生成链接
            </Button>
          </CardFooter>
        </Card>
      </form>

      {isLogin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">我最近发布的</CardTitle>
            <CardDescription>此列表仅自己可见，他人需通过链接访问。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {mineLoading && !mine.length ? (
              <p className="text-sm text-muted-foreground">加载中…</p>
            ) : mineError && !mine.length ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-destructive">{mineError}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void loadMine()}
                >
                  重试
                </Button>
              </div>
            ) : !mine.length ? (
              <p className="text-sm text-muted-foreground">还没有发布过，发布后会出现在这里</p>
            ) : (
              <>
                {mineError ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>刷新失败：{mineError}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void loadMine()}
                    >
                      重试
                    </Button>
                  </div>
                ) : null}
                {mine.map((p) => (
                  <div
                    key={p.slug}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/p/${p.slug}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {p.title || p.slug}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {languageLabel(p.language)}
                        {p.createdAt ? ` · ${formatTime(String(p.createdAt))}` : ''}
                      </p>
                    </div>
                    <ConfirmDialog
                      title="删除这条粘贴？"
                      description={`「${p.title || p.slug}」删除后，分享链接将失效且无法恢复。`}
                      confirmLabel="删除"
                      destructive
                      onConfirm={() => void handleDelete(p.slug)}
                    >
                      <Button type="button" size="sm" variant="outline">
                        删除
                      </Button>
                    </ConfirmDialog>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}
