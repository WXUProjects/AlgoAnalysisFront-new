import { extractMarkdownCodeText } from '@/lib/markdown'

const COPY_LABEL = '复制'
const COPIED_LABEL = '已复制'
const FAIL_LABEL = '复制失败'
const FEEDBACK_MS = 1600

/**
 * 在 Markdown 根节点上委托处理 `.md-code-copy` 点击：复制代码并短时反馈文案。
 * 返回卸载时调用的清理函数。
 */
export function bindMarkdownCodeCopy(root: HTMLElement): () => void {
  const timers = new WeakMap<HTMLButtonElement, number>()

  const restore = (btn: HTMLButtonElement, label: string) => {
    if (!btn.isConnected) return
    btn.textContent = label
    btn.removeAttribute('data-state')
    btn.disabled = false
  }

  const onClick = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const el = target.closest('button.md-code-copy')
    if (!el || el.tagName !== 'BUTTON' || !root.contains(el)) return
    const btn = el as HTMLButtonElement

    event.preventDefault()
    event.stopPropagation()

    const block = btn.closest('.md-code-block')
    if (!block) return

    const text = extractMarkdownCodeText(block)
    const baseLabel = btn.getAttribute('data-label') || COPY_LABEL
    btn.setAttribute('data-label', baseLabel)

    const prevTimer = timers.get(btn)
    if (prevTimer != null) window.clearTimeout(prevTimer)

    void (async () => {
      try {
        await navigator.clipboard.writeText(text)
        btn.textContent = COPIED_LABEL
        btn.dataset.state = 'copied'
        const t = window.setTimeout(() => restore(btn, baseLabel), FEEDBACK_MS)
        timers.set(btn, t)
      } catch {
        btn.textContent = FAIL_LABEL
        btn.dataset.state = 'failed'
        const t = window.setTimeout(() => restore(btn, baseLabel), FEEDBACK_MS)
        timers.set(btn, t)
      }
    })()
  }

  root.addEventListener('click', onClick)
  return () => {
    root.removeEventListener('click', onClick)
  }
}
