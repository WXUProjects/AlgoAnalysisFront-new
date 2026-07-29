type MermaidRenderResult = {
  svg: string
  bindFunctions?: (element: Element) => void
}

export type MermaidApi = {
  initialize(config: Record<string, unknown>): void
  render(id: string, source: string): Promise<MermaidRenderResult>
}

export type MermaidLoader = () => Promise<MermaidApi>

let diagramSequence = 0

async function defaultLoader(): Promise<MermaidApi> {
  const module = await import('mermaid')
  return module.default as MermaidApi
}

function sourceFromBlock(block: Element): string {
  const sources = block.querySelectorAll('.md-code-src')
  if (sources.length > 0) {
    return Array.from(sources, (source) => {
      return source.getAttribute('data-copy-text') || source.textContent || ''
    }).join('\n')
  }
  return block.querySelector('code.language-mermaid')?.textContent || ''
}

/** Render Mermaid fences only when present; a failed diagram keeps its source block. */
export async function bindMarkdownMermaid(
  root: HTMLElement,
  loader: MermaidLoader = defaultLoader,
  isCancelled: () => boolean = () => false,
): Promise<void> {
  const blocks = Array.from(
    root.querySelectorAll('.md-code-block:has(code.language-mermaid)'),
  )
  if (blocks.length === 0) return

  let mermaid: MermaidApi
  try {
    mermaid = await loader()
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme:
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark')
          ? 'dark'
          : 'default',
    })
  } catch {
    return
  }

  for (const block of blocks) {
    if (isCancelled()) return
    const source = sourceFromBlock(block).trim()
    if (!source) continue
    try {
      const id = `goalgo-mermaid-${++diagramSequence}`
      const rendered = await mermaid.render(id, source)
      if (isCancelled() || !block.isConnected) return
      const container = document.createElement('div')
      container.className = 'obsidian-mermaid'
      container.setAttribute('role', 'img')
      container.setAttribute('aria-label', 'Mermaid 图表')
      container.innerHTML = rendered.svg
      block.replaceWith(container)
      rendered.bindFunctions?.(container)
    } catch {
      // Keep the highlighted, copyable source block as the local fallback.
    }
  }
}
