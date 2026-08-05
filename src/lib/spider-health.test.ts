import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  explainSpiderError,
  formatSyncAge,
  spiderPlatformHealth,
  userSyncHealth,
} from './spider-health'

describe('explainSpiderError', () => {
  it('classifies CF 403 html as system, not username', () => {
    const raw =
      'all platforms failed for user 2: 请求响应码错误 403, <html> <head><title>403 Forbidden</title></head> <body> <center><h1>403 Forbidden</h1></center> <hr><center>nginx/1.27.4</center> <script type="modul'
    const r = explainSpiderError(raw, 'CodeForces')
    assert.equal(r.fault, 'system')
    assert.match(r.detail, /Codeforces/)
    assert.match(r.detail, /不是.*账号|稍后再试/)
    assert.doesNotMatch(r.detail, /<html|nginx\/1\.27|all platforms failed/)
    assert.doesNotMatch(r.detail, /请检查用户名后重新绑定/)
  })

  it('classifies not found as user fault', () => {
    const r = explainSpiderError(
      'codeforces user.rating: handles: User with handle xxx not found',
      'CodeForces',
    )
    assert.equal(r.fault, 'user')
    assert.match(r.detail, /检查用户名|重新绑定/)
  })

  it('passes through backend formatted system message', () => {
    const raw = 'Codeforces：对方站点暂时拒绝访问。一般不是账号问题，请稍后再试'
    const r = explainSpiderError(raw, 'CodeForces')
    assert.equal(r.fault, 'system')
    assert.match(r.detail, /一般不是账号问题/)
  })
})

describe('spiderPlatformHealth / userSyncHealth', () => {
  const now = 1_700_000_000

  it('failed platform carries fault and readable detail', () => {
    const h = spiderPlatformHealth(
      {
        platform: 'CodeForces',
        lastSyncAt: now - 3600,
        lastFailAt: now - 60,
        lastError:
          'all platforms failed for user 2: 请求响应码错误 403, <html>403 Forbidden nginx',
      },
      now,
    )
    assert.equal(h.kind, 'failed')
    assert.equal(h.fault, 'system')
    assert.deepEqual(h.platforms, ['Codeforces'])
    assert.doesNotMatch(h.detail, /请检查用户名后重新绑定/)
  })

  it('userSyncHealth names the failed platform', () => {
    const h = userSyncHealth(
      [
        {
          platform: 'AtCoder',
          username: 'a',
          lastSyncAt: now - 100,
          lastFailAt: 0,
        },
        {
          platform: 'CodeForces',
          username: 'b',
          lastSyncAt: now - 3600,
          lastFailAt: now - 10,
          lastError: '请求响应码错误 403, <html>x',
        },
      ],
      now - 100,
      now,
    )
    assert.ok(h)
    assert.equal(h!.kind, 'failed')
    assert.match(h!.detail, /Codeforces/)
    assert.equal(h!.fault, 'system')
  })

  it('userSyncHealth aggregates multiple system failures', () => {
    const h = userSyncHealth(
      [
        {
          platform: 'CodeForces',
          username: 'a',
          lastFailAt: now,
          lastError: '403 forbidden',
        },
        {
          platform: 'NowCoder',
          username: 'b',
          lastFailAt: now,
          lastError: 'timeout',
        },
      ],
      0,
      now,
    )
    assert.ok(h)
    assert.match(h!.detail, /Codeforces/)
    assert.match(h!.detail, /牛客/)
    assert.equal(h!.fault, 'system')
  })

  it('stale health includes relative age', () => {
    const h = spiderPlatformHealth(
      {
        platform: 'AtCoder',
        lastSyncAt: now - 5 * 3600,
        lastFailAt: 0,
      },
      now,
    )
    assert.equal(h.kind, 'stale')
    assert.match(h.detail, /5 小时前/)
  })
})

describe('formatSyncAge', () => {
  const now = 1_700_000_000

  it('formats hours and empty for never', () => {
    assert.equal(formatSyncAge(0, now), '')
    assert.equal(formatSyncAge(now - 90, now), '1 分钟前')
    assert.equal(formatSyncAge(now - 3 * 3600, now), '3 小时前')
    assert.equal(formatSyncAge(now - 15 * 3600, now), '15 小时前')
  })
})
