import { endpoints, type AgentSummaryData } from '@shared/api'
import { get, str, type ApiResult } from '@/lib/http'

export async function getRecentSummary(
  userId: number,
): Promise<ApiResult<AgentSummaryData>> {
  const res = await get<Record<string, unknown>>(endpoints.agent.summary.recent, {
    userId,
  })
  if (!res.success) return { ...res, data: null }

  // { code, msg, resp: "{\"msg\":[],\"updateTime\":\"\"}" }
  const raw = (res.raw ?? res.data ?? {}) as Record<string, unknown>
  let parsed: AgentSummaryData = { msg: [], updateTime: '' }

  try {
    if (typeof raw.resp === 'string' && raw.resp) {
      const inner = JSON.parse(raw.resp) as { msg?: string[]; updateTime?: string }
      parsed = {
        msg: Array.isArray(inner.msg) ? inner.msg.map(String) : [],
        updateTime: str(inner.updateTime),
      }
    } else if (res.data && typeof res.data === 'object') {
      const d = res.data as Record<string, unknown>
      if (Array.isArray(d.msg)) {
        parsed = { msg: d.msg.map(String), updateTime: str(d.updateTime) }
      }
    }
  } catch {
    parsed = { msg: [str(raw.msg || raw.message || '暂无总结')], updateTime: '' }
  }

  return { success: true, message: str(raw.msg || 'ok'), data: parsed }
}
