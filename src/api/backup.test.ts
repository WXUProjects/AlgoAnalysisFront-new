import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import type { AxiosRequestConfig } from 'axios'
import { endpoints } from '../../../shared/api'
import { http } from '@/lib/http'
import {
  downloadDisasterBackupKey,
  getDisasterBackupStatus,
  parseDisasterBackupStatus,
  runDisasterBackup,
} from './backup'

const observedStatus = {
  enabled: true,
  status: 'idle',
  trigger: '',
  stage: 'idle',
  message: '',
  error: '',
  startedAt: '0',
  finishedAt: '0',
  archiveKey: '',
  archiveSize: '0',
  sha256: '',
  databaseCount: 0,
}

afterEach(() => {
  http.defaults.adapter = undefined
})

test('parses the observed backup status and converts int64 strings', () => {
  assert.deepEqual(parseDisasterBackupStatus(observedStatus), {
    ...observedStatus,
    startedAt: 0,
    finishedAt: 0,
    archiveSize: 0,
  })
})

test('GET uses the shared status endpoint and parses its nested status', async () => {
  let request: AxiosRequestConfig | undefined
  http.defaults.adapter = async (config) => {
    request = config
    return {
      data: { status: observedStatus },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  const result = await getDisasterBackupStatus()

  assert.equal(request?.method, 'get')
  assert.equal(request?.url, endpoints.core.backup.status)
  assert.equal(result.success, true)
  assert.equal(result.data?.status.archiveSize, 0)
})

test('POST uses the shared run endpoint and parses the accepted status', async () => {
  let request: AxiosRequestConfig | undefined
  http.defaults.adapter = async (config) => {
    request = config
    return {
      data: { accepted: true, status: { ...observedStatus, status: 'running' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  const result = await runDisasterBackup()

  assert.equal(request?.method, 'post')
  assert.equal(request?.url, endpoints.core.backup.run)
  assert.equal(result.data?.accepted, true)
  assert.equal(result.data?.status.status, 'running')
  assert.equal(result.data?.status.startedAt, 0)
})

test('GET uses the shared key endpoint and returns the base64 key', async () => {
  let request: AxiosRequestConfig | undefined
  http.defaults.adapter = async (config) => {
    request = config
    return {
      data: { key: 'AQID' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  const result = await downloadDisasterBackupKey()

  assert.equal(request?.method, 'get')
  assert.equal(request?.url, endpoints.core.backup.key)
  assert.equal(result.success, true)
  assert.equal(result.data?.key, 'AQID')
})

test('download key rejects empty payload', async () => {
  http.defaults.adapter = async (config) => ({
    data: { key: '' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })

  const result = await downloadDisasterBackupKey()

  assert.equal(result.success, true)
  assert.equal(result.data, null)
})
