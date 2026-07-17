import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useEffect, type ReactNode } from 'react'
import {
  BoldIcon,
  CodeIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  SquareCodeIcon,
  Undo2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  className?: string
  disabled?: boolean
  /** 全页模式：工具栏占位不滚动，正文区域独立滚动（勿用 sticky，会盖住正文） */
  fullPage?: boolean
  placeholder?: string
}

export function RichTextEditor({
  value,
  onChange,
  className,
  disabled,
  fullPage,
  placeholder,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank' } }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none outline-none',
          fullPage ? 'min-h-full px-4 py-4' : 'min-h-32 px-3 py-2',
        ),
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [disabled, editor])

  if (!editor) return null

  function setLink() {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('链接 URL', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const toolbar = (
    <div
      className={cn(
        'flex shrink-0 flex-wrap gap-1 border-b bg-background p-1.5',
      )}
    >
      <ToolbarBtn
        active={editor.isActive('bold')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="粗体"
      >
        <BoldIcon />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('italic')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="斜体"
      >
        <ItalicIcon />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('heading', { level: 2 })}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="二级标题"
      >
        <Heading2Icon />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('heading', { level: 3 })}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="三级标题"
      >
        <Heading3Icon />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('bulletList')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="无序列表"
      >
        <ListIcon />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('orderedList')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="有序列表"
      >
        <ListOrderedIcon />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('blockquote')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="引用"
      >
        <QuoteIcon />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('code')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="行内代码"
      >
        <CodeIcon />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('codeBlock')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="代码块"
      >
        <SquareCodeIcon />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('link')}
        disabled={disabled}
        onClick={setLink}
        title="链接"
      >
        <LinkIcon />
      </ToolbarBtn>
      <div className="mx-0.5 w-px self-stretch bg-border" />
      <ToolbarBtn
        disabled={disabled || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
        title="撤销"
      >
        <Undo2Icon />
      </ToolbarBtn>
      <ToolbarBtn
        disabled={disabled || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
        title="重做"
      >
        <Redo2Icon />
      </ToolbarBtn>
    </div>
  )

  return (
    <div
      className={cn(
        'rounded-md border bg-background',
        fullPage
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 border-t'
          : 'overflow-hidden',
        className,
      )}
    >
      {toolbar}
      {/* 正文为唯一滚动容器；工具栏 shrink-0 占位，绝不 sticky 盖住内容 */}
      <EditorContent
        editor={editor}
        className={cn(
          'focus-within:outline-none [&_.tiptap]:outline-none',
          fullPage
            ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain'
            : 'min-h-32 [&_.tiptap]:min-h-32',
        )}
      />
    </div>
  )
}

function ToolbarBtn({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'ghost'}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className="size-8 p-0"
    >
      {children}
    </Button>
  )
}
