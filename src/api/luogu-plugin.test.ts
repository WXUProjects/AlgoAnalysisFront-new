import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import type { AxiosRequestConfig } from 'axios'
import { http, post } from '@/lib/http'
import { activeLuoguAuthorization, createLuoguAuthorizeCode, listLuoguAuthorizations } from './luogu-plugin'

afterEach(() => {
  http.defaults.adapter = undefined
})

test('returns a bare protojson authorization code to the authorization page', async () => {
  http.defaults.adapter = async (config) => ({
    data: {
      code: 'one-time-random-code',
      state: 'plugin-state-123',
      expiresAt: '1780000000',
      scope: 'luogu.sync',
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })

  const result = await createLuoguAuthorizeCode({
    state: 'plugin-state-123',
    codeChallenge: 'A'.repeat(43),
    luoguUid: '2245873',
    clientKind: 'userscript',
    clientVersion: '1.0.0',
    codeChallengeMethod: 'S256',
    scope: 'luogu.sync',
    riskAccepted: true,
    riskVersion: '2026-08-28-v1',
  })

  assert.equal(result.success, true)
  assert.equal(result.data?.code, 'one-time-random-code')
  assert.equal(result.data?.expiresAt, '1780000000')
})

test('preserves an unauthorized authorization-code response as a failure', async () => {
  http.defaults.adapter = async (config: AxiosRequestConfig) => Promise.reject({
    message: 'Request failed with status code 401',
    config,
    response: {
      data: { code: 16, message: 'JWT Token not found' },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
    },
  })

  const result = await createLuoguAuthorizeCode({
    state: 'plugin-state-123',
    codeChallenge: 'A'.repeat(43),
    luoguUid: '2245873',
    clientKind: 'userscript',
    clientVersion: '1.0.0',
    codeChallengeMethod: 'S256',
    scope: 'luogu.sync',
    riskAccepted: true,
    riskVersion: '2026-08-28-v1',
  })

  assert.equal(result.success, false)
  assert.equal(result.data, null)
  assert.equal(result.status, 401)
})

test('keeps existing 2xx code envelopes as business failures', async () => {
  http.defaults.adapter = async (config) => ({
    data: { code: 7, message: 'business failure' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })

  const result = await post('/api/example')

  assert.equal(result.success, false)
  assert.equal(result.message, 'business failure')
})

test('loads Luogu authorization list and picks an active authorization', async () => {
  http.defaults.adapter = async (config) => ({
    data: { authorizations: [{ provider: 'luogu', luoguUid: '2245873', revokedAt: '0', expiresAt: String(Math.floor(Date.now() / 1000) + 3600) }] },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })
  const result = await listLuoguAuthorizations()
  assert.equal(result.success, true)
  assert.equal(activeLuoguAuthorization(result.data?.authorizations, '2245873')?.luoguUid, '2245873')
})
