const KEY = 'emergency_ack_max_id'

export function getEmergencyAckMaxId(): number {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return 0
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  } catch {
    return 0
  }
}

export function setEmergencyAckMaxId(id: number): void {
  try {
    const cur = getEmergencyAckMaxId()
    const next = Math.max(cur, Math.floor(id))
    localStorage.setItem(KEY, String(next))
  } catch {
    // ignore
  }
}
