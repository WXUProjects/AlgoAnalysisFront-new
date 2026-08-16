import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('operations monitor hides technical service errors and renders empty states', () => {
  const source = readFileSync(new URL('../pages/dashboard/OpsMonitor.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /service\.errMsg/)
  assert.match(source, /暂未取得服务状态/)
})

test('site settings stays busy until server synchronization completes', () => {
  const source = readFileSync(new URL('../pages/dashboard/SiteSettings.tsx', import.meta.url), 'utf8')
	assert.match(source, /await syncFromServer\(section, savedRev\)[\s\S]*?setSavingSection\(null\)/)
	assert.match(source, /const again = await getSiteAdminConfig\(\)[\s\S]*?const d = again\.data[\s\S]*?setSaving\(false\)/)
})
