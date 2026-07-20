import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { HeatmapItem } from '@shared/api'
import {
  sumHeatmap,
  computeActiveDays,
  computeDailyAvg,
  computePassRate,
  computeActiveMembers,
  computeParticipationRate,
  computePeakDay,
  computeConsecutiveDays,
  compareRecent7vsPrev7,
  computeNoAcMembers,
  computeWeekdayDistribution,
} from '@/lib/dashboard-metrics'

function heat(date: string, count: number): HeatmapItem {
  return { date, count }
}

describe('sumHeatmap', () => {
  it('sums all counts', () => {
    assert.equal(sumHeatmap([heat('2026-01-01', 5), heat('2026-01-02', 3)]), 8)
  })
  it('returns 0 for empty', () => {
    assert.equal(sumHeatmap([]), 0)
  })
  it('handles zero counts', () => {
    assert.equal(sumHeatmap([heat('2026-01-01', 0), heat('2026-01-02', 0)]), 0)
  })
})

describe('computeActiveDays', () => {
  it('counts days with submissions', () => {
    assert.equal(
      computeActiveDays([heat('2026-01-01', 5), heat('2026-01-02', 0), heat('2026-01-03', 1)]),
      2,
    )
  })
  it('returns 0 for empty', () => {
    assert.equal(computeActiveDays([]), 0)
  })
})

describe('computeDailyAvg', () => {
  it('computes average', () => {
    assert.equal(computeDailyAvg(10, 5), 2)
  })
  it('returns 0 for 0 days', () => {
    assert.equal(computeDailyAvg(10, 0), 0)
  })
  it('rounds to 1 decimal', () => {
    assert.equal(computeDailyAvg(10, 3), 3.3)
  })
})

describe('computePassRate', () => {
  it('computes percentage', () => {
    assert.equal(computePassRate(80, 100), 80)
  })
  it('returns 0 for 0 submit', () => {
    assert.equal(computePassRate(5, 0), 0)
  })
  it('rounds to 1 decimal', () => {
    assert.equal(computePassRate(1, 3), 33.3)
  })
})

describe('computeActiveMembers', () => {
  it('uses rankTotal clamped to memberTotal', () => {
    assert.equal(computeActiveMembers(50, 100), 50)
  })
  it('clamps at memberTotal', () => {
    assert.equal(computeActiveMembers(150, 100), 100)
  })
  it('returns 0 for 0 rankTotal', () => {
    assert.equal(computeActiveMembers(0, 100), 0)
  })
  it('handles negative rankTotal', () => {
    assert.equal(computeActiveMembers(-5, 100), 0)
  })
})

describe('computeParticipationRate', () => {
  it('computes rate', () => {
    assert.equal(computeParticipationRate(5, 10), 50)
  })
  it('returns 0 for 0 total', () => {
    assert.equal(computeParticipationRate(5, 0), 0)
  })
})

describe('computePeakDay', () => {
  it('finds peak', () => {
    const result = computePeakDay([heat('2026-01-01', 3), heat('2026-01-02', 10), heat('2026-01-03', 1)])
    assert.deepEqual(result, { date: '2026-01-02', count: 10 })
  })
  it('returns null for empty', () => {
    assert.equal(computePeakDay([]), null)
  })
})

describe('computeConsecutiveDays', () => {
  it('computes streak', () => {
    assert.equal(
      computeConsecutiveDays([
        heat('2026-01-01', 1),
        heat('2026-01-02', 1),
        heat('2026-01-03', 1),
        heat('2026-01-05', 1),
      ]),
      3,
    )
  })
  it('returns 0 for empty', () => {
    assert.equal(computeConsecutiveDays([]), 0)
  })
  it('returns 0 for all zero counts', () => {
    assert.equal(computeConsecutiveDays([heat('2026-01-01', 0)]), 0)
  })
})

describe('compareRecent7vsPrev7', () => {
  it('uses fixed endDate, not runtime date', () => {
    const heatItems: HeatmapItem[] = []
    // recent 7 days (ending 2026-07-20): 2 each
    for (let i = 0; i < 7; i++) {
      const d = new Date('2026-07-20T00:00:00')
      d.setDate(d.getDate() - i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      heatItems.push(heat(`${y}-${m}-${day}`, 2))
    }
    // prev 7 days: 1 each
    for (let i = 7; i < 14; i++) {
      const d = new Date('2026-07-20T00:00:00')
      d.setDate(d.getDate() - i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      heatItems.push(heat(`${y}-${m}-${day}`, 1))
    }
    const result = compareRecent7vsPrev7(heatItems, '2026-07-20')
    assert.equal(result.direction, 'up')
    assert.equal(result.recent, 14)
    assert.equal(result.prev, 7)
    assert.equal(result.delta, 7)
  })

  it('detects downward trend with fixed date', () => {
    const heatItems: HeatmapItem[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date('2026-06-15T00:00:00')
      d.setDate(d.getDate() - i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      heatItems.push(heat(`${y}-${m}-${day}`, 1))
    }
    for (let i = 7; i < 14; i++) {
      const d = new Date('2026-06-15T00:00:00')
      d.setDate(d.getDate() - i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      heatItems.push(heat(`${y}-${m}-${day}`, 5))
    }
    const result = compareRecent7vsPrev7(heatItems, '2026-06-15')
    assert.equal(result.direction, 'down')
    assert.equal(result.recent, 7)
    assert.equal(result.prev, 35)
  })

  it('returns flat when equal', () => {
    const result = compareRecent7vsPrev7([], '2026-01-20')
    assert.equal(result.direction, 'flat')
    assert.equal(result.recent, 0)
    assert.equal(result.prev, 0)
  })
})

describe('computeNoAcMembers', () => {
  it('computes max(total - rankTotal, 0)', () => {
    assert.equal(computeNoAcMembers(100, 60), 40)
  })
  it('returns 0 when rankTotal >= memberTotal', () => {
    assert.equal(computeNoAcMembers(50, 60), 0)
  })
  it('returns memberTotal when rankTotal is 0', () => {
    assert.equal(computeNoAcMembers(100, 0), 100)
  })
  it('handles negative rankTotal', () => {
    assert.equal(computeNoAcMembers(100, -5), 100)
  })
})

describe('computeWeekdayDistribution', () => {
  it('distributes by weekday', () => {
    // 2026-01-05 is Monday (1)
    const dist = computeWeekdayDistribution([heat('2026-01-05', 10)])
    assert.equal(dist[1], 10)
    assert.equal(dist[0], 0)
  })
  it('returns 7 zeros for empty', () => {
    assert.deepEqual(computeWeekdayDistribution([]), [0, 0, 0, 0, 0, 0, 0])
  })
})
