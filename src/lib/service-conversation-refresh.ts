interface VisibilityTarget extends EventTarget {
  visibilityState: string
}

export function bindConversationRefresh(
  windowTarget: EventTarget,
  documentTarget: VisibilityTarget,
  refresh: () => void,
): () => void {
  const onVisibility = () => {
    if (documentTarget.visibilityState === 'visible') refresh()
  }
  windowTarget.addEventListener('focus', refresh)
  documentTarget.addEventListener('visibilitychange', onVisibility)
  return () => {
    windowTarget.removeEventListener('focus', refresh)
    documentTarget.removeEventListener('visibilitychange', onVisibility)
  }
}

export function createRefreshQueue(refresh: () => Promise<void>): () => Promise<void> {
  let running: Promise<void> | null = null
  let trailing = false

  return () => {
    if (running) {
      trailing = true
      return running
    }
    running = (async () => {
      do {
        trailing = false
        try {
          await refresh()
        } catch {
          // Event-driven refresh is best-effort; a queued trigger must still run.
        }
      } while (trailing)
    })().finally(() => {
      running = null
    })
    return running
  }
}
