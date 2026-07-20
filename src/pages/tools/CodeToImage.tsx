import { useCallback, useMemo, useRef, useState } from 'react'
import { useHoverTransform } from '@/hooks/use-hover-motion'
import { MOTION } from '@/lib/motion'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  DownloadIcon,
  CopyIcon,
  ImageIcon,
  ArrowLeftIcon,
} from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  THEMES,
  FONTS,
  getTheme,
  highlightCode,
  inlineHighlightColors,
  exportCarbonPng,
  downloadDataUrl,
  copyDataUrlToClipboard,
  CARBON_LANGUAGES,
  languageLabel,
  DEFAULT_CARBON_SETTINGS,
  BG_PRESETS,
  type CarbonUiSettings,
} from '@/lib/carbon'

const SAMPLE = `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int n;
  cin >> n;
  cout << "Hello, GoAlgo!\\n";
  return 0;
}
`

function BgSwatch({
  bg,
  active,
  onClick,
}: {
  bg: string
  active: boolean
  onClick: () => void
}) {
  const { ref, hoverHandlers } = useHoverTransform<HTMLButtonElement>({
    scale: MOTION.hover.scale,
  })
  return (
    <button
      ref={ref}
      type="button"
      title={bg}
      className="size-7 rounded-md border border-border shadow-xs ring-offset-background will-change-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[active=true]:ring-2 data-[active=true]:ring-primary"
      style={{ background: bg }}
      data-active={active}
      onClick={onClick}
      {...hoverHandlers}
    />
  )
}

export function CodeToImage() {
  const [code, setCode] = useState(SAMPLE)
  const [settings, setSettings] = useState<CarbonUiSettings>({
    ...DEFAULT_CARBON_SETTINGS,
  })
  const [exporting, setExporting] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)

  const theme = useMemo(() => getTheme(settings.theme), [settings.theme])

  const { html, detectedLanguage } = useMemo(() => {
    const raw = code.replace(/\r\n/g, '\n').replace(/^\n+/, '').replace(/\n+$/, '')
    if (!raw) return { html: '', detectedLanguage: 'plaintext' }
    const { html: hl, detectedLanguage: det } = highlightCode(
      raw,
      settings.language,
    )
    return {
      html: inlineHighlightColors(hl, theme.highlights, theme.highlights.text),
      detectedLanguage: det,
    }
  }, [code, settings.language, theme])

  const lines = useMemo(() => {
    if (!html) return ['']
    return html.split('\n')
  }, [html])

  const patch = useCallback((partial: Partial<CarbonUiSettings>) => {
    setSettings((s) => ({ ...s, ...partial }))
  }, [])

  const fontCss = useMemo(() => {
    const name = settings.fontFamily || 'monospace'
    if (/^(monospace|serif|sans-serif)$/i.test(name)) return name
    return `'${name.replace(/'/g, "\\'")}', monospace`
  }, [settings.fontFamily])

  async function handleExport() {
    const frame = frameRef.current
    if (!frame) return
    if (!code.trim()) {
      toast.error('请先粘贴代码')
      return
    }
    setExporting(true)
    try {
      const dataUrl = await exportCarbonPng(frame, {
        scale: settings.exportScale,
        dropShadow: settings.dropShadow,
        backgroundColor: settings.backgroundColor.startsWith('linear')
          ? '#abb8c3'
          : settings.backgroundColor,
        codeBg: theme.highlights.background,
        textColor: theme.highlights.text,
        fontSize: settings.fontSize,
        fontFamily: fontCss,
        primaryFont: settings.fontFamily,
      })
      downloadDataUrl(dataUrl, `code-${Date.now()}.png`)
      toast.success('已下载 PNG')
    } catch {
      toast.error('导出失败，请稍后重试')
    } finally {
      setExporting(false)
    }
  }

  async function handleCopy() {
    const frame = frameRef.current
    if (!frame) return
    if (!code.trim()) {
      toast.error('请先粘贴代码')
      return
    }
    setExporting(true)
    try {
      const dataUrl = await exportCarbonPng(frame, {
        scale: settings.exportScale,
        dropShadow: settings.dropShadow,
        backgroundColor: settings.backgroundColor.startsWith('linear')
          ? '#abb8c3'
          : settings.backgroundColor,
        codeBg: theme.highlights.background,
        textColor: theme.highlights.text,
        fontSize: settings.fontSize,
        fontFamily: fontCss,
        primaryFont: settings.fontFamily,
      })
      const ok = await copyDataUrlToClipboard(dataUrl)
      if (ok) toast.success('已复制到剪贴板')
      else {
        downloadDataUrl(dataUrl, `code-${Date.now()}.png`)
        toast.message('当前浏览器无法复制图片，已改为下载文件')
      }
    } catch {
      toast.error('复制失败，请稍后重试')
    } finally {
      setExporting(false)
    }
  }

  const windowRadius =
    settings.windowTheme === 'sharp'
      ? 0
      : settings.windowTheme === 'bw'
        ? 0
        : 5

  return (
    <PageShell className="mx-auto w-full max-w-6xl gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
              <Link to="/tools">
                <ArrowLeftIcon className="size-4" />
                工具
              </Link>
            </Button>
          </div>
          <h1 className="mt-1 text-lg font-semibold">代码转图片</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Carbon 风格导出，支持语法高亮与语言自动识别。
            {settings.language === 'auto' && detectedLanguage
              ? ` 当前识别：${languageLabel(detectedLanguage)}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void handleCopy()}
            disabled={exporting}
          >
            <CopyIcon className="size-4" />
            复制图片
          </Button>
          <Button onClick={() => void handleExport()} disabled={exporting}>
            <DownloadIcon className="size-4" />
            {exporting ? '导出中…' : '下载 PNG'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">代码</CardTitle>
              <CardDescription>粘贴或编辑代码后，下方会实时预览。</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="min-h-40 font-mono text-sm"
                spellCheck={false}
                placeholder="在此粘贴代码"
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="size-4" />
                预览
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto bg-muted/40 p-4">
              <div className="flex min-h-40 justify-center">
                <div
                  ref={frameRef}
                  className="carbon-frame inline-block"
                  style={{
                    padding: `${settings.paddingVertical}px ${settings.paddingHorizontal}px`,
                    background: settings.backgroundColor,
                  }}
                >
                  <div
                    className="carbon-window"
                    style={{
                      position: 'relative',
                      borderRadius: windowRadius,
                      border:
                        settings.windowTheme === 'bw'
                          ? '2px solid #fff'
                          : 'none',
                      background: theme.highlights.background,
                      color: theme.highlights.text,
                      boxShadow: settings.dropShadow
                        ? 'rgba(0,0,0,0.55) 0px 20px 68px'
                        : 'none',
                      overflow: 'hidden',
                      minWidth: 90,
                      display: settings.widthAdjustment
                        ? 'inline-block'
                        : 'block',
                      maxWidth: settings.widthAdjustment ? 1024 : undefined,
                      width: settings.widthAdjustment
                        ? undefined
                        : settings.width,
                    }}
                  >
                    {settings.windowControls ? (
                      <div
                        className="carbon-controls"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '12px 14px 0',
                          height: 36,
                        }}
                      >
                        <span
                          className="carbon-dot"
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: '#ff5f56',
                            display: 'inline-block',
                          }}
                        />
                        <span
                          className="carbon-dot"
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: '#ffbd2e',
                            display: 'inline-block',
                          }}
                        />
                        <span
                          className="carbon-dot"
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: '#27c93f',
                            display: 'inline-block',
                          }}
                        />
                      </div>
                    ) : null}
                    <div
                      className="carbon-code"
                      style={{
                        padding: `${settings.windowControls ? 12 : 18}px 18px 18px ${
                          settings.lineNumbers ? 4 : 10
                        }px`,
                        fontFamily: fontCss,
                        fontSize: settings.fontSize,
                        lineHeight: `${settings.lineHeight}%`,
                        whiteSpace: 'pre',
                        tabSize: 2,
                        overflow: 'hidden',
                        color: theme.highlights.text,
                      }}
                    >
                      <pre
                        style={{
                          margin: 0,
                          padding: 0,
                          background: 'transparent',
                          font: 'inherit',
                          whiteSpace: 'pre',
                        }}
                      >
                        <code
                          style={{
                            margin: 0,
                            padding: 0,
                            background: 'transparent',
                            font: 'inherit',
                            color: 'inherit',
                            whiteSpace: 'pre',
                          }}
                        >
                          {lines.map((line, i) => (
                            <span
                              key={i}
                              style={{ display: 'block', minHeight: '1em' }}
                            >
                              {settings.lineNumbers ? (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    minWidth: '1.6em',
                                    marginRight: '0.75em',
                                    textAlign: 'right',
                                    opacity: 0.45,
                                    userSelect: 'none',
                                  }}
                                >
                                  {i + 1}
                                </span>
                              ) : null}
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: line || ' ',
                                }}
                              />
                            </span>
                          ))}
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">外观</CardTitle>
            <CardDescription>调整主题、字体和导出参数。</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>语言</FieldLabel>
                <Select
                  value={settings.language}
                  onValueChange={(v) => patch({ language: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARBON_LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>主题</FieldLabel>
                <Select
                  value={settings.theme}
                  onValueChange={(v) => patch({ theme: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>字体</FieldLabel>
                <Select
                  value={settings.fontFamily}
                  onValueChange={(v) => patch({ fontFamily: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.filter((f) => f !== 'editor').map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>背景色</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {BG_PRESETS.map((bg) => (
                    <BgSwatch
                      key={bg}
                      bg={bg}
                      active={settings.backgroundColor === bg}
                      onClick={() => patch({ backgroundColor: bg })}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  className="mt-2 h-9 w-full cursor-pointer rounded-md border border-input bg-transparent"
                  value={
                    settings.backgroundColor.startsWith('#')
                      ? settings.backgroundColor.slice(0, 7)
                      : settings.backgroundColor.startsWith('rgba')
                        ? '#abb8c3'
                        : '#abb8c3'
                  }
                  onChange={(e) => patch({ backgroundColor: e.target.value })}
                />
              </Field>

              <Field>
                <FieldLabel>
                  内边距 {settings.paddingVertical} /{' '}
                  {settings.paddingHorizontal}
                </FieldLabel>
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">垂直</Label>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    value={settings.paddingVertical}
                    onChange={(e) =>
                      patch({ paddingVertical: Number(e.target.value) })
                    }
                    className="w-full accent-primary"
                  />
                  <Label className="text-xs text-muted-foreground">水平</Label>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    value={settings.paddingHorizontal}
                    onChange={(e) =>
                      patch({ paddingHorizontal: Number(e.target.value) })
                    }
                    className="w-full accent-primary"
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel>字号 {settings.fontSize}px</FieldLabel>
                <input
                  type="range"
                  min={10}
                  max={24}
                  value={settings.fontSize}
                  onChange={(e) =>
                    patch({ fontSize: Number(e.target.value) })
                  }
                  className="w-full accent-primary"
                />
              </Field>

              <Field>
                <FieldLabel>导出倍率</FieldLabel>
                <Select
                  value={String(settings.exportScale)}
                  onValueChange={(v) =>
                    patch({ exportScale: Number(v) as 1 | 2 | 4 })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                    <SelectItem value="4">4x</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="wc">窗口按钮</Label>
                  <Switch
                    id="wc"
                    checked={settings.windowControls}
                    onCheckedChange={(v) => patch({ windowControls: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="ds">阴影</Label>
                  <Switch
                    id="ds"
                    checked={settings.dropShadow}
                    onCheckedChange={(v) => patch({ dropShadow: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="ln">行号</Label>
                  <Switch
                    id="ln"
                    checked={settings.lineNumbers}
                    onCheckedChange={(v) => patch({ lineNumbers: v })}
                  />
                </div>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
