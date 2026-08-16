import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseHealthOverview } from './health'

test('health overview parses backend and external services separately', () => {
  const overview = parseHealthOverview({
    backendServices: [
      { name: 'core-data', status: 'ok', errMsg: '' },
	  { name: 'agent', status: 'unchecked', errMsg: '未发现注册实例' },
    ],
    services: [{ name: 'smtp', status: 'ok', at: 123, errMsg: '' }],
  })

  assert.deepEqual(overview.backendServices, [
    { name: 'core-data', status: 'ok', errMsg: '' },
	{ name: 'agent', status: 'unchecked', errMsg: '未发现注册实例' },
  ])
  assert.equal(overview.services[0]?.name, 'smtp')
})
