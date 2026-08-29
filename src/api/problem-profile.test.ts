import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import type { AxiosRequestConfig } from 'axios'
import { endpoints } from '../../../shared/api'
import { http } from '@/lib/http'
import { getProblemUserProfile } from './problem'

afterEach(() => {
  http.defaults.adapter = undefined
})

test('keeps the top-eight radar and every returned tag statistic', async () => {
  let request: AxiosRequestConfig | undefined
  const tagStats = Array.from({ length: 40 }, (_, index) => ({
    tag: `tag-${index}`,
    score: String(80 - index),
    acCount: String(100 - index),
  }))
  http.defaults.adapter = async (config) => {
    request = config
    return {
      data: {
        code: '0',
        message: 'success',
        radar: tagStats.slice(0, 8),
        tagStats,
        platforms: [],
        difficulties: [],
        totalAc: '870',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  const result = await getProblemUserProfile(2)

  assert.equal(request?.url, endpoints.core.problem.userProfile)
  assert.deepEqual(request?.params, { userId: 2 })
  assert.equal(result.data?.radar.length, 8)
  assert.equal(result.data?.tagStats.length, 40)
  assert.deepEqual(result.data?.tagStats[0], {
    tag: 'tag-0',
    score: 80,
    acCount: 100,
  })
  assert.equal(result.data?.totalAc, 870)
})

test('falls back to radar while an older backend has no tagStats field', async () => {
  http.defaults.adapter = async (config) => ({
    data: {
      code: '0',
      message: 'success',
      radar: [{ tag: '动态规划', score: 55, acCount: '38' }],
      platforms: [],
      difficulties: [],
      totalAc: '38',
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })

  const result = await getProblemUserProfile(2)

  assert.deepEqual(result.data?.tagStats, result.data?.radar)
})
