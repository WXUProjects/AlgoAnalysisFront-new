/**
 * 「服务」Tab 待回复小红点。
 * - 登录态下轮询/聚焦时请求当前活跃工单，`pending_customer`（客服等待用户回复）才显示红点
 * - 网络失败保留上次已知状态，不把红点错误清零
 * - 非登录态恒不显示
 */
import { useSyncExternalStore } from 'react'
import { jwt } from '@/lib/jwt'
import { getCurrentTicket } from '@/api/tickets'

export interface ServiceBadgeState {
  /** 是否显示「待回复」红点（仅 pending_customer） */
  visible: boolean
  /** 最近一次查询结果是否失败（false 表示有可用状态） */
  failed: boolean
}

let state: ServiceBadgeState = { visible: false, failed: false }
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()

function setState(next: ServiceBadgeState | ((prev: ServiceBadgeState) => ServiceBadgeState)) {
  const resolved =
    typeof next === 'function' ? (next as (prev: ServiceBadgeState) => ServiceBadgeState)(state) : next
  if (resolved.visible === state.visible && resolved.failed === state.failed) return
  state = resolved
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): ServiceBadgeState {
  return state
}

/** 未登录直接清空（不请求） */
export function resetServiceBadge() {
  inFlight = null
  setState({ visible: false, failed: false })
}

/**
 * 刷新待回复标记：仅登录态请求 current。
 * - success 且 pending_customer → visible=true；其余 → false
 * - 网络/服务失败 → 保留上次状态并置 failed
 */
export async function refreshServiceBadge(): Promise<void> {
  if (inFlight) return inFlight
  if (!jwt.isValid()) {
    resetServiceBadge()
    return
  }
  inFlight = (async () => {
    try {
      const res = await getCurrentTicket()
      if (res.success) {
        const pending = res.data?.ticket?.status === 'pending_customer'
        setState({ visible: pending, failed: false })
      } else {
        setState((prev: ServiceBadgeState) => ({ ...prev, failed: true }))
      }
    } catch {
      setState((prev: ServiceBadgeState) => ({ ...prev, failed: true }))
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

/** React hook：订阅当前待回复状态 */
export function useServiceBadge(): ServiceBadgeState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
