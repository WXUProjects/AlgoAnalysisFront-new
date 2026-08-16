import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SpiderBinding } from '../../shared/api'
import { OJ_PLATFORMS } from './link'
import {
  getOjBindingChanges,
  initializeOjBindings,
  mergeSavedOjBindings,
  saveOjBindings,
  shouldCloseOjBindDialogAfterSave,
  shouldCloseOjBindDialog,
  shouldInitializeOjBindings,
} from './oj-bindings'

describe('initializeOjBindings', () => {
  it('initializes every supported platform and prefills bound usernames', () => {
    const spiders: SpiderBinding[] = [
      { platform: 'AtCoder', username: 'tourist' },
      { platform: 'LuoGu', username: '983446' },
      { platform: 'UnknownOJ', username: 'ignored' },
    ]

    const values = initializeOjBindings(spiders)

    assert.deepEqual(Object.keys(values), OJ_PLATFORMS.map(({ value }) => value))
    assert.equal(values.AtCoder, 'tourist')
    assert.equal(values.LuoGu, '983446')
    assert.equal(values.NowCoder, '')
    assert.equal('UnknownOJ' in values, false)
  })

  it('initializes empty values when bindings are absent', () => {
    const values = initializeOjBindings(undefined)

    for (const { value } of OJ_PLATFORMS) {
      assert.equal(values[value], '')
    }
  })
})

describe('getOjBindingChanges', () => {
  it('returns trimmed non-empty changes in platform order', () => {
    const initial = initializeOjBindings([
      { platform: 'AtCoder', username: 'old-user' },
      { platform: 'LuoGu', username: '983446' },
    ])
    const current = {
      ...initial,
      AtCoder: '  new-user  ',
      NowCoder: '  978880410 ',
      LuoGu: '   ',
    }

    assert.deepEqual(getOjBindingChanges(initial, current), [
      { platform: 'AtCoder', username: 'new-user' },
      { platform: 'NowCoder', username: '978880410' },
    ])
  })

  it('ignores whitespace-only edits and values unchanged after trimming', () => {
    const initial = initializeOjBindings([
      { platform: 'CodeForces', username: ' tourist ' },
    ])
    const current = {
      ...initial,
      CodeForces: 'tourist',
      QOJ: '   ',
    }

    assert.deepEqual(getOjBindingChanges(initial, current), [])
  })
})

describe('shouldInitializeOjBindings', () => {
  it('initializes on a real open transition or a locked platform change', () => {
    assert.equal(shouldInitializeOjBindings(true, false, '', ''), true)
    assert.equal(shouldInitializeOjBindings(true, true, 'AtCoder', ''), true)
  })

  it('does not initialize again when only refreshed spider data changes', () => {
    assert.equal(shouldInitializeOjBindings(true, true, 'AtCoder', 'AtCoder'), false)
    assert.equal(shouldInitializeOjBindings(false, true, 'AtCoder', 'AtCoder'), false)
  })
})

describe('shouldCloseOjBindDialog', () => {
  it('rejects a close request while saving', () => {
    assert.equal(shouldCloseOjBindDialog(false, true), false)
  })

  it('allows a close request when not saving', () => {
    assert.equal(shouldCloseOjBindDialog(false, false), true)
  })
})

describe('shouldCloseOjBindDialogAfterSave', () => {
  it('keeps the dialog open when force refresh fails after every item was saved', () => {
    assert.equal(shouldCloseOjBindDialogAfterSave(2, 2, 'refresh failed'), false)
  })

  it('closes only when every item was saved and refresh succeeded', () => {
    assert.equal(shouldCloseOjBindDialogAfterSave(2, 2), true)
    assert.equal(shouldCloseOjBindDialogAfterSave(2, 1), false)
  })
})

describe('mergeSavedOjBindings', () => {
  it('advances only saved initial values while preserving all current inputs', () => {
    const initial = initializeOjBindings(undefined)
    const current = {
      ...initial,
      AtCoder: 'saved-user',
      LuoGu: 'failed-user',
    }

    const merged = mergeSavedOjBindings(initial, current, [
      { platform: 'AtCoder', username: 'saved-user' },
    ])

    assert.equal(merged.initial.AtCoder, 'saved-user')
    assert.equal(merged.initial.LuoGu, '')
    assert.deepEqual(merged.current, current)
  })
})

describe('saveOjBindings', () => {
  it('continues after a failed item and syncs once when another item succeeds', async () => {
    const changes = [
      { platform: 'AtCoder' as const, username: 'first' },
      { platform: 'LuoGu' as const, username: 'second' },
      { platform: 'CodeForces' as const, username: 'third' },
    ]
    const attempted: string[] = []
    let syncCount = 0

    const result = await saveOjBindings(
      changes,
      async (change) => {
        attempted.push(change.platform)
        return { success: change.platform !== 'LuoGu', message: 'invalid' }
      },
      async () => {
        syncCount += 1
      },
    )

    assert.deepEqual(attempted, ['AtCoder', 'LuoGu', 'CodeForces'])
    assert.deepEqual(result.saved, [changes[0], changes[2]])
    assert.deepEqual(result.failed, [{ change: changes[1], message: 'invalid' }])
    assert.equal(syncCount, 1)
  })

  it('classifies a thrown save as failed, continues, and force-refreshes profile once', async () => {
    const changes = [
      { platform: 'AtCoder' as const, username: 'first' },
      { platform: 'LuoGu' as const, username: 'second' },
      { platform: 'CodeForces' as const, username: 'third' },
    ]
    const attempted: string[] = []
    const syncOptions: Array<
      { forceProfile?: boolean; requireProfile?: boolean } | undefined
    > = []

    const result = await saveOjBindings(
      changes,
      async (change) => {
        attempted.push(change.platform)
        if (change.platform === 'LuoGu') throw new Error('network down')
        return { success: true }
      },
      async (options) => {
        syncOptions.push(options)
      },
    )

    assert.deepEqual(attempted, ['AtCoder', 'LuoGu', 'CodeForces'])
    assert.deepEqual(result.saved, [changes[0], changes[2]])
    assert.deepEqual(result.failed, [
      { change: changes[1], message: 'network down' },
    ])
    assert.deepEqual(syncOptions, [
      { forceProfile: true, requireProfile: true },
    ])
  })

  it('returns saved bindings and syncError when the single force refresh rejects', async () => {
    const changes = [
      { platform: 'AtCoder' as const, username: 'first' },
      { platform: 'LuoGu' as const, username: 'second' },
    ]
    let syncCount = 0

    const result = await saveOjBindings(
      changes,
      async () => ({ success: true }),
      async () => {
        syncCount += 1
        throw new Error('refresh failed')
      },
    )

    assert.deepEqual(result.saved, changes)
    assert.deepEqual(result.failed, [])
    assert.equal(result.syncError, 'refresh failed')
    assert.equal(syncCount, 1)
  })
})
