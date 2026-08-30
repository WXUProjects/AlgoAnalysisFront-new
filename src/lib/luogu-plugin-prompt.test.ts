import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shouldShowLuoguInstallPrompt } from './luogu-plugin-prompt'

const base = { previousUid: '100', currentUid: '200', savedPlatforms: ['LuoGu'] as string[], authorizedUids: [] as string[], promptedUid: undefined as string | undefined }

test('shows once after a successful Luogu UID change without active authorization', () => {
  assert.equal(shouldShowLuoguInstallPrompt(base), true)
  assert.equal(shouldShowLuoguInstallPrompt({ ...base, promptedUid: '200' }), false)
})

test('does not show when Luogu did not change or already has authorization', () => {
  assert.equal(shouldShowLuoguInstallPrompt({ ...base, savedPlatforms: [] }), false)
  assert.equal(shouldShowLuoguInstallPrompt({ ...base, authorizedUids: ['200'] }), false)
  assert.equal(shouldShowLuoguInstallPrompt({ ...base, previousUid: '200' }), false)
})
