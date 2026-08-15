import assert from 'node:assert/strict'
import test from 'node:test'
import { bindConversationRefresh, createRefreshQueue } from './service-conversation-refresh'

test('refreshes on focus and when the page becomes visible', () => {
  const windowTarget = new EventTarget()
  const documentTarget = new EventTarget() as EventTarget & { visibilityState: string }
  documentTarget.visibilityState = 'hidden'
  let refreshes = 0

  const cleanup = bindConversationRefresh(
    windowTarget,
    documentTarget,
    () => {
      refreshes += 1
    },
  )

  windowTarget.dispatchEvent(new Event('focus'))
  documentTarget.dispatchEvent(new Event('visibilitychange'))
  documentTarget.visibilityState = 'visible'
  documentTarget.dispatchEvent(new Event('visibilitychange'))
  assert.equal(refreshes, 2)

  cleanup()
  windowTarget.dispatchEvent(new Event('focus'))
  assert.equal(refreshes, 2)
})

test('coalesces concurrent triggers into one trailing refresh', async () => {
  const resolvers: Array<() => void> = []
  let refreshes = 0
  const refresh = createRefreshQueue(async () => {
    refreshes += 1
    await new Promise<void>((resolve) => resolvers.push(resolve))
  })

  const first = refresh()
  void refresh()
  void refresh()
  assert.equal(refreshes, 1)

  resolvers.shift()?.()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(refreshes, 2)
  resolvers.shift()?.()
  await first
})

test('runs a queued trailing refresh after a failed attempt', async () => {
  let attempts = 0
  let release: (() => void) | undefined
  const refresh = createRefreshQueue(async () => {
    attempts += 1
    if (attempts === 1) {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      throw new Error('network error')
    }
  })

  const first = refresh()
  void refresh()
  release?.()
  await first
  assert.equal(attempts, 2)
})
