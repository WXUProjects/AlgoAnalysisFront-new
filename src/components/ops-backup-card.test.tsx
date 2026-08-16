import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { JSDOM } from 'jsdom'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type {
  DisasterBackupStatus,
  GetDisasterBackupStatusRes,
  RunDisasterBackupRes,
} from '../../../shared/api'
import type { ApiResult } from '@/lib/http'
import { OpsBackupCard } from './ops-backup-card'

const idleStatus: DisasterBackupStatus = {
  enabled: true,
  status: 'idle',
  trigger: '',
  stage: 'idle',
  message: '',
  error: '',
  startedAt: 0,
  finishedAt: 0,
  archiveKey: '',
  archiveSize: 0,
  sha256: '',
  databaseCount: 0,
}

const ok = <T,>(data: T): ApiResult<T> => ({ success: true, message: 'ok', data })
let root: Root | undefined

afterEach(async () => {
  if (root) await act(() => root?.unmount())
  root = undefined
})

function installDom() {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: 'http://localhost',
  })
  Object.assign(globalThis, {
    React,
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  })
  return dom.window.document.getElementById('root') as HTMLDivElement
}

test('renders translated status and disables manual backup when unavailable', async () => {
  const container = installDom()
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <OpsBackupCard
        getStatus={async () => ok<GetDisasterBackupStatusRes>({
          status: { ...idleStatus, enabled: false, status: 'disabled' },
        })}
        runBackup={async () => ok<RunDisasterBackupRes>({
          accepted: false,
          status: idleStatus,
        })}
      />,
    )
  })

  assert.match(container.textContent ?? '', /数据备份/)
  assert.match(container.textContent ?? '', /未启用/)
  assert.equal(container.querySelector('button')?.disabled, true)
})

test('manual backup submits once and disables the button while pending', async () => {
  const container = installDom()
  let resolveRun: ((result: ApiResult<RunDisasterBackupRes>) => void) | undefined
  let runCalls = 0
  root = createRoot(container)

  await act(async () => {
    root?.render(
      <OpsBackupCard
        getStatus={async () => ok<GetDisasterBackupStatusRes>({ status: idleStatus })}
        runBackup={() => {
          runCalls += 1
          return new Promise((resolve) => {
            resolveRun = resolve
          })
        }}
      />,
    )
  })

  const button = container.querySelector('button') as HTMLButtonElement
  await act(async () => button.dispatchEvent(new window.MouseEvent('click', { bubbles: true })))

  assert.equal(runCalls, 1)
  assert.equal(button.disabled, true)
  assert.match(button.textContent ?? '', /备份中/)

  await act(async () => {
    resolveRun?.(ok({
      accepted: true,
      status: { ...idleStatus, status: 'running', trigger: 'manual' },
    }))
  })
})
