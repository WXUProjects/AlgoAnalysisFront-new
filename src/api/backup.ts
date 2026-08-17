import { endpoints } from '@shared/api'
import type {
  DisasterBackupState,
  DisasterBackupStatus,
  DisasterBackupTrigger,
  DownloadBackupKeyRes,
  GetDisasterBackupStatusRes,
  RunDisasterBackupRes,
} from '@shared/api'
import { bool, get, num, post, str, type ApiResult } from '@/lib/http'

const backupStates = new Set<DisasterBackupState>([
  'idle',
  'running',
  'succeeded',
  'failed',
  'disabled',
])
const backupTriggers = new Set<DisasterBackupTrigger>(['', 'manual', 'scheduled'])

export function parseDisasterBackupStatus(raw: unknown): DisasterBackupStatus {
  const value = (raw ?? {}) as Record<string, unknown>
  const status = str(value.status) as DisasterBackupState
  const trigger = str(value.trigger) as DisasterBackupTrigger
  return {
    enabled: bool(value.enabled),
    status: backupStates.has(status) ? status : 'idle',
    trigger: backupTriggers.has(trigger) ? trigger : '',
    stage: str(value.stage),
    message: str(value.message),
    error: str(value.error),
    startedAt: num(value.startedAt),
    finishedAt: num(value.finishedAt),
    archiveKey: str(value.archiveKey),
    archiveSize: num(value.archiveSize),
    sha256: str(value.sha256),
    databaseCount: num(value.databaseCount),
  }
}

export async function getDisasterBackupStatus(): Promise<ApiResult<GetDisasterBackupStatusRes>> {
  const res = await get<Record<string, unknown>>(endpoints.core.backup.status)
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: { status: parseDisasterBackupStatus(raw.status) },
  }
}

export async function runDisasterBackup(): Promise<ApiResult<RunDisasterBackupRes>> {
  const res = await post<Record<string, unknown>>(endpoints.core.backup.run, {})
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  return {
    ...res,
    data: {
      accepted: bool(raw.accepted),
      status: parseDisasterBackupStatus(raw.status),
    },
  }
}

export async function downloadDisasterBackupKey(): Promise<ApiResult<DownloadBackupKeyRes>> {
  const res = await get<Record<string, unknown>>(endpoints.core.backup.key)
  if (!res.success) return { ...res, data: null }
  const raw = (res.data ?? res.raw ?? {}) as Record<string, unknown>
  const key = str(raw.key)
  if (!key) return { ...res, data: null, message: '备份加密密钥为空' }
  return { ...res, data: { key } }
}
