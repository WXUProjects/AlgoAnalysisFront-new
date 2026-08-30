import assert from 'node:assert/strict'
import { test } from 'node:test'
import { endpoints } from '@shared/api'
import { http } from '@/lib/http'
import { latestAuthorizationRows, listPluginAuthorizations, listSyncAudits } from './plugin-admin'

test('lists plugin authorizations with server-side filters and normalizes pagination', async () => {
  let requestUrl = ''
  http.defaults.adapter = async (config) => {
    requestUrl = `${config.url}?${new URLSearchParams(config.params as Record<string, string>).toString()}`
    return {
      data: {
        data: {
          list: [{
            id: '7', userId: '42', username: 'alice', name: 'Alice', provider: 'luogu',
            platform: 'LuoGu', ojUid: '100', clientKind: 'userscript', clientVersion: '1.2.0',
            acceptedAt: '10', expiresAt: '20', lastUsedAt: '15', revokedAt: '0', status: 'active',
          }],
          total: '1', pageNum: 2, pageSize: 20,
        },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  const result = await listPluginAuthorizations({ pageNum: 2, pageSize: 20, keyword: 'ali', status: 'active', platform: 'LuoGu' })
  assert.equal(requestUrl, `${endpoints.user.admin.plugins.authorizations}?pageNum=2&pageSize=20&keyword=ali&status=active&platform=luogu`)
  assert.deepEqual(result.data, {
    list: [{
      id: '7', userId: '42', username: 'alice', name: 'Alice', provider: 'luogu', platform: 'LuoGu', ojUid: '100',
      clientKind: 'userscript', clientVersion: '1.2.0', acceptedAt: 10, expiresAt: 20, lastUsedAt: 15, revokedAt: 0, status: 'active',
    }], total: 1, pageNum: 2, pageSize: 20,
  })
})

test('lists sync audits with date filters and normalizes string counters', async () => {
  let params: Record<string, unknown> | undefined
  http.defaults.adapter = async (config) => {
    params = config.params as Record<string, unknown>
    return { data: { list: [{ sessionId: 's', authorizationId: '2', userId: '3', platform: 'LuoGu', ojUid: '4', clientKind: 'userscript', clientVersion: '1.0.0', status: 'completed', completionReason: 'checkpoint', startedAt: '10', updatedAt: '20', terminalAt: '20', processedPages: 2, remoteCount: 5, inserted: '4', restartCount: 0, errorCode: '', errorMessage: '' }], total: '1', pageNum: 1, pageSize: 10 }, status: 200, statusText: 'OK', headers: {}, config }
  }
  const result = await listSyncAudits({ pageNum: 1, pageSize: 10, keyword: 'alice', platform: 'LuoGu', status: 'completed', from: 1, to: 9 })
  assert.deepEqual(params, { pageNum: 1, pageSize: 10, keyword: 'alice', platform: 'luogu', status: 'completed', from: 1, to: 9 })
  assert.equal(result.data?.list[0]?.inserted, 4)
  assert.equal(result.data?.total, 1)
})

test('keeps only the newest row for each user and plugin account in the UI fallback', () => {
  const rows = [
    { id: '2', userId: '1', provider: 'luogu', platform: 'luogu', ojUid: '123', clientKind: 'userscript', clientVersion: '0.1.3' },
    { id: '1', userId: '1', provider: 'luogu', platform: 'luogu', ojUid: '123', clientKind: 'userscript', clientVersion: '0.1.0' },
  ] as AdminPluginAuthorizationInfo[]
  assert.deepEqual(latestAuthorizationRows(rows).map((row) => row.clientVersion), ['0.1.3'])
})
