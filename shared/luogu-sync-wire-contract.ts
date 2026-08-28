import type {
  LuoguSyncPageRes,
  LuoguSyncRecord,
  LuoguSyncStartRes,
  LuoguSyncStatusRes,
  LuoguSyncErrorRes,
} from './api'

const startWire = {
  sessionId: 'session-1',
  sessionToken: 'session-token',
  resumed: false,
  nextPage: 1,
  pageDelayMs: 500,
  expiresAt: '1777381200',
  nextAvailableAt: '1777379400',
} as const

const statusWire = {
  sessionId: 'session-1',
  nextPage: 2,
  inserted: '20',
  processedPages: 1,
  totalPages: 3,
  expiresAt: '1777381200',
  nextAvailableAt: '1777379400',
  connected: false,
  done: false,
  completionReason: '',
} as const

const pageWire = {
  connected: false,
  done: false,
  completionReason: '',
  nextPage: 2,
  restart: false,
  pageInserted: '20',
  inserted: '20',
  processedPages: 1,
  totalPages: 3,
  nextAvailableAt: '1777379400',
} as const

const recordWire = {
  submitId: '100001',
  submitTime: '1777379400',
  status: 0,
  language: 1,
  problem: { pid: 'P1001', title: 'Example', difficulty: 1 },
} as const

export const luoguSyncWireContract: {
  start: LuoguSyncStartRes
  status: LuoguSyncStatusRes
  page: LuoguSyncPageRes
  record: LuoguSyncRecord
} = {
  start: startWire,
  status: statusWire,
  page: pageWire,
  record: recordWire,
}

export const luoguSyncCooldownErrorWireContract: LuoguSyncErrorRes = {
  code: 429,
  reason: 'SYNC_COOLDOWN',
  message: 'sync is cooling down',
  metadata: {
    code: 'SYNC_COOLDOWN',
    nextAvailableAt: '1777379400',
    retryAfterSeconds: '300',
  },
}

export const luoguSyncCooldownCompatibilityWireContract: LuoguSyncErrorRes = {
  code: 429,
  reason: 'SYNC_COOLDOWN',
  message: 'sync is cooling down',
  nextAvailableAt: '1777379400',
  retryAfterSeconds: '300',
}
