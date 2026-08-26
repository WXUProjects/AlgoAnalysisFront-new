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

test('spider error acknowledgement uses the installed shadcn Button', () => {
  const source = readFileSync(new URL('../pages/dashboard/OpsSpiderMonitor.tsx', import.meta.url), 'utf8')
  assert.match(source, /import \{ Button \} from '@\/components\/ui\/button'/)
  assert.match(source, /<Button[\s\S]*?>\s*知道了\s*<\/Button>/)
  assert.doesNotMatch(source, /<button[^>]*>\s*知道了\s*<\/button>/)
})

test('spider error text ignores recovered sync errors while an account error is active', () => {
  const source = readFileSync(new URL('../pages/dashboard/OpsSpiderMonitor.tsx', import.meta.url), 'utf8')
  assert.match(source, /const activeSyncError = hasRecentFail \? stat\.lastError : ''/)
  assert.match(source, /const activeAccountError = hasAccountFail \? stat\.accountErr : ''/)
  assert.match(source, /const activeErrorTime = Math\.max\([\s\S]*?hasRecentFail \? stat\.lastFailAt : 0,[\s\S]*?hasAccountFail \? stat\.accountAt : 0,/)
  assert.match(source, /const errorText = activeSyncError \|\| activeAccountError \|\| `最近失败 \$\{formatTime\(activeErrorTime\)\}`/)
})
