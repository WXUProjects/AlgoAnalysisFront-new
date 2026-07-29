import { useMemo, useState } from 'react'
import {
  CheckIcon,
  ChevronDownIcon,
  ClipboardCopyIcon,
  ImageIcon,
  PlusIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import {
  isImageUsedInArticle,
  markdownImageSnippet,
  type BlogSessionImage,
} from '@/lib/blog-image'
import { cn } from '@/lib/utils'

export type UploadProgressItem = {
  id: string
  name: string
  percent: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

type Props = {
  images: BlogSessionImage[]
  content: string
  coverUrl?: string
  uploads?: UploadProgressItem[]
  onInsert: (markdown: string) => void
  className?: string
  /** 可折叠；默认展开。全屏编辑建议 defaultOpen=false */
  collapsible?: boolean
  defaultOpen?: boolean
  /** 无图时也显示外壳（便于全屏占位） */
  forceShow?: boolean
  compact?: boolean
}

/**
 * 当前文章图片库：预览、复制图片标记、插入正文；上传中显示进度。
 * 未写入正文/头图的图，保存文章后由后端 GC 永久删除。
 */
export function BlogImagePanel({
  images,
  content,
  coverUrl = '',
  uploads = [],
  onInsert,
  className,
  collapsible = false,
  defaultOpen = true,
  forceShow = false,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const rows = useMemo(() => {
    return images.map((img) => ({
      ...img,
      used: isImageUsedInArticle(img.url, content, coverUrl),
    }))
  }, [images, content, coverUrl])

  const activeUploads = uploads.filter((u) => u.status === 'uploading')
  const hasContent = rows.length > 0 || uploads.length > 0

  if (!hasContent && !forceShow) return null

  async function copyMd(url: string, name: string) {
    const md = markdownImageSnippet(url, name || '图片')
    try {
      await navigator.clipboard.writeText(md)
      toast.success('已复制图片标记')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  const body = (
    <>
      {uploads.length > 0 ? (
        <div className="mb-3 flex flex-col gap-2">
          {uploads.map((u) => (
            <div key={u.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">
                  {u.name}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {u.status === 'error'
                    ? u.error || '失败'
                    : u.status === 'done'
                      ? '完成'
                      : `${u.percent}%`}
                </span>
              </div>
              <Progress
                value={u.status === 'done' ? 100 : u.percent}
                className={cn(
                  'h-1.5',
                  u.status === 'error' && 'bg-destructive/20',
                )}
              />
            </div>
          ))}
          {activeUploads.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              正在上传 {activeUploads.length} 张…
            </p>
          ) : null}
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul
          className={cn(
            'grid gap-2',
            compact
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
          )}
        >
          {rows.map((img) => (
            <li
              key={img.id}
              className="group flex flex-col overflow-hidden rounded-md border bg-background"
            >
              <div className="relative aspect-video bg-muted/40">
                <img
                  src={img.url}
                  alt={img.name}
                  className="size-full object-contain p-1"
                  loading="lazy"
                />
                {img.used ? (
                  <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    <CheckIcon className="size-2.5" />
                    已用
                  </span>
                ) : (
                  <span className="absolute top-1 left-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    未用
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 p-1.5">
                <p
                  className="truncate text-[11px] text-muted-foreground"
                  title={img.name}
                >
                  {img.name || '图片'}
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      onInsert(markdownImageSnippet(img.url, img.name || '图片'))
                      toast.success('已插入正文')
                    }}
                  >
                    <PlusIcon data-icon="inline-start" />
                    插入
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => void copyMd(img.url, img.name)}
                    aria-label="复制图片标记"
                  >
                    <ClipboardCopyIcon />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          还没有图片。上传或粘贴后会出现在这里。
        </p>
      )}
    </>
  )

  const countLabel =
    rows.length > 0
      ? `${rows.length} 张`
      : activeUploads.length > 0
        ? `上传中 ${activeUploads.length}`
        : '暂无'

  if (collapsible) {
    return (
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className={cn('rounded-md border bg-card', className)}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/40"
          >
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
              <ImageIcon className="size-4 shrink-0" />
              <span className="truncate">文章图片</span>
              <span className="text-xs font-normal text-muted-foreground">
                · {countLabel}
              </span>
            </span>
            <ChevronDownIcon
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform',
                open && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-3 py-3">
            <p className="mb-3 text-xs text-muted-foreground">
              可预览、复制或插入正文。保存后，不用的图会自动清理。
            </p>
            {body}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <div className={cn('rounded-md border bg-card p-3 sm:p-4', className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-medium">
            <ImageIcon className="size-4" />
            文章图片
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            可预览、复制或插入正文。保存文章后，不用的图会自动清理。
          </p>
        </div>
      </div>
      {body}
    </div>
  )
}
