import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildLuoguAuthorizeCodeRequest,
  LUOGU_AUTHORIZE_TARGET_ORIGIN,
  createAuthorizationCodeMessenger,
  parseLuoguAuthorizeQuery,
} from './luogu-plugin-auth'

const validChallenge = 'A'.repeat(43)

const validQuery = new URLSearchParams({
  state: 'plugin-state-123',
  code_challenge: validChallenge,
  luogu_uid: '2245873',
  client_kind: 'userscript',
  client_version: '1.0.0',
})

test('rejects missing or invalid authorization query parameters', () => {
  for (const [key, value] of [
    ['state', ''],
    ['code_challenge', 'short'],
    ['code_challenge', 'A'.repeat(44)],
    ['code_challenge', `${'A'.repeat(42)}*`],
    ['luogu_uid', 'abc'],
    ['luogu_uid', '12.3'],
    ['client_kind', 'desktop'],
    ['client_version', ''],
    ['client_version', '   '],
  ]) {
    const query = new URLSearchParams(validQuery)
    query.set(key, value)
    assert.equal(parseLuoguAuthorizeQuery(query).ok, false, `${key}=${value}`)
  }
})

test('accepts userscript and rejects retired Chrome extension authorization queries', () => {
  const userscript = parseLuoguAuthorizeQuery(validQuery)
  assert.deepEqual(userscript, {
    ok: true,
    value: {
      state: 'plugin-state-123',
      codeChallenge: validChallenge,
      luoguUid: '2245873',
      clientKind: 'userscript',
      clientVersion: '1.0.0',
    },
  })

  const extension = new URLSearchParams(validQuery)
  extension.set('client_kind', 'chrome-extension')
  assert.equal(parseLuoguAuthorizeQuery(extension).ok, false)
})

test('measures client version limits in UTF-8 bytes', () => {
  const atLimit = new URLSearchParams(validQuery)
  atLimit.set('client_version', `${'测'.repeat(21)}a`)
  assert.equal(parseLuoguAuthorizeQuery(atLimit).ok, true)

  const overLimit = new URLSearchParams(validQuery)
  overLimit.set('client_version', `${'测'.repeat(21)}ab`)
  assert.equal(parseLuoguAuthorizeQuery(overLimit).ok, false)
})

test('accepts the proto maximum state length and rejects a longer state', () => {
  const maximum = new URLSearchParams(validQuery)
  maximum.set('state', 's'.repeat(256))
  assert.equal(parseLuoguAuthorizeQuery(maximum).ok, true)

  const tooLong = new URLSearchParams(maximum)
  tooLong.set('state', 's'.repeat(257))
  assert.equal(parseLuoguAuthorizeQuery(tooLong).ok, false)
})

test('builds the fixed S256 Luogu authorization contract', () => {
  const parsed = parseLuoguAuthorizeQuery(validQuery)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return

  assert.deepEqual(buildLuoguAuthorizeCodeRequest(parsed.value), {
    state: 'plugin-state-123',
    codeChallenge: validChallenge,
    luoguUid: '2245873',
    clientKind: 'userscript',
    clientVersion: '1.0.0',
    codeChallengeMethod: 'S256',
    scope: 'luogu.sync',
    riskAccepted: true,
    riskVersion: '2026-08-28-v1',
  })
})

test('posts an authorization code only to the fixed Luogu origin', () => {
  const sent: Array<{ message: unknown; origin: string }> = []
  const send = createAuthorizationCodeMessenger((message, origin) => {
    sent.push({ message, origin })
  })

  assert.equal(send('plugin-state-123', 'code-one-time'), true)
  assert.deepEqual(sent, [{
    message: {
      type: 'goalgo.luogu.authorized',
      state: 'plugin-state-123',
      code: 'code-one-time',
    },
    origin: LUOGU_AUTHORIZE_TARGET_ORIGIN,
  }])
})

test('does not send the same authorization code more than once', () => {
  let calls = 0
  const send = createAuthorizationCodeMessenger(() => {
    calls += 1
  })

  assert.equal(send('plugin-state-123', 'code-one-time'), true)
  assert.equal(send('plugin-state-123', 'code-one-time'), false)
  assert.equal(calls, 1)
})

test('does not lock the messenger when the opener is missing or postMessage fails', () => {
  const noOpener = createAuthorizationCodeMessenger(undefined)
  assert.equal(noOpener('plugin-state-123', 'code-one-time'), false)

  let calls = 0
  let shouldThrow = true
  const send = createAuthorizationCodeMessenger(() => {
    calls += 1
    if (shouldThrow) throw new Error('opener unavailable')
  })

  assert.equal(send('plugin-state-123', 'code-one-time'), false)
  shouldThrow = false
  assert.equal(send('plugin-state-123', 'code-one-time'), true)
  assert.equal(calls, 2)
})
