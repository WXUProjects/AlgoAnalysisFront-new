import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { buildRadarChartData } from './algo-profile-radar'

type RadarInput = { tag: string; score: number; acCount: number }

const radar = (tag: string, score: number, acCount: number): RadarInput => ({
  tag,
  score,
  acCount,
})

describe('buildRadarChartData', () => {
  it('clamps scores before sorting and uses AC count as the tie-breaker', () => {
    const result = buildRadarChartData([
      radar('low AC', 150, 1),
      radar('high AC', 100, 3),
      radar('middle', 90, 8),
    ])

    assert.deepEqual(
      result.map(({ fullName, score, acCount }) => ({ fullName, score, acCount })),
      [
        { fullName: 'high AC', score: 100, acCount: 3 },
        { fullName: 'low AC', score: 100, acCount: 1 },
        { fullName: 'middle', score: 90, acCount: 8 },
      ],
    )
  })

  it('clamps negative scores to zero', () => {
    assert.equal(buildRadarChartData([radar('negative', -20, 2)])[0]?.score, 0)
  })

  it('falls back safely for NaN and infinite scores', () => {
    const result = buildRadarChartData([
      radar('nan', Number.NaN, 1),
      radar('positive infinity', Number.POSITIVE_INFINITY, 2),
      radar('negative infinity', Number.NEGATIVE_INFINITY, 3),
    ])

    assert.deepEqual(
      result.map(({ fullName, score }) => ({ fullName, score })),
      [
        { fullName: 'negative infinity', score: 0 },
        { fullName: 'positive infinity', score: 0 },
        { fullName: 'nan', score: 0 },
      ],
    )
  })

  it('normalizes invalid AC counts to zero without corrupting same-score ordering', () => {
    const result = buildRadarChartData([
      radar('invalid-positive-infinity', 80, Number.POSITIVE_INFINITY),
      radar('valid-count', 80, 2),
      radar('invalid-negative-infinity', 80, Number.NEGATIVE_INFINITY),
      radar('invalid-nan', 80, Number.NaN),
      radar('invalid-negative', 80, -4),
    ])

    assert.deepEqual(
      result.map(({ fullName, score, acCount }) => ({ fullName, score, acCount })),
      [
        { fullName: 'valid-count', score: 80, acCount: 2 },
        { fullName: 'invalid-nan', score: 80, acCount: 0 },
        { fullName: 'invalid-negative', score: 80, acCount: 0 },
        { fullName: 'invalid-negative-infinity', score: 80, acCount: 0 },
        { fullName: 'invalid-positive-infinity', score: 80, acCount: 0 },
      ],
    )
    assert.equal(
      result.every(
        ({ score, acCount }) =>
          Number.isFinite(score) && score >= 0 && Number.isFinite(acCount) && acCount >= 0,
      ),
      true,
    )
  })

  it('sorts before truncating to the top eight entries', () => {
    const result = buildRadarChartData(
      Array.from({ length: 9 }, (_, index) =>
        radar(`tag-${index}`, index === 0 ? 100 : index, index),
      ),
    )

    assert.equal(result.length, 8)
    assert.equal(result[0]?.fullName, 'tag-0')
    assert.equal(result[1]?.fullName, 'tag-8')
    assert.equal(result.at(-1)?.fullName, 'tag-2')
    assert.equal(result.some(({ fullName }) => fullName === 'tag-1'), false)
  })

  it('uses the complete trimmed tag for deterministic ties', () => {
    const result = buildRadarChartData([
      radar('  beta  ', 80, 4),
      radar('alpha', 80, 4),
      radar('gamma', 80, 4),
    ])

    assert.deepEqual(
      result.map(({ fullName }) => fullName),
      ['alpha', 'beta', 'gamma'],
    )
  })

  it('sorts by fullName when tied subjects share the same six-character prefix', () => {
    const input = [
      radar('  prefix-z  ', 80, 4),
      radar('prefix-a', 80, 4),
    ]
    const forward = buildRadarChartData(input)
    const reverse = buildRadarChartData([...input].reverse())

    assert.deepEqual(
      forward.map(({ subject, fullName }) => ({ subject, fullName })),
      [
        { subject: 'prefix…', fullName: 'prefix-a' },
        { subject: 'prefix…', fullName: 'prefix-z' },
      ],
    )
    assert.deepEqual(forward, reverse)
  })

  it('does not change with input permutation', () => {
    const input = [
      radar('zeta', 80, 2),
      radar('alpha', 100, 1),
      radar('beta', 100, 1),
      radar('gamma', 80, 2),
    ]

    assert.deepEqual(
      buildRadarChartData(input),
      buildRadarChartData([...input].reverse()),
    )
  })
})

describe('AlgoProfileChart radar direction', () => {
  it('pins a full clockwise sweep from the top', () => {
    const source = readFileSync(new URL('./algo-profile-chart.tsx', import.meta.url), 'utf8')

    assert.match(source, /<RadarChart[\s\S]*startAngle=\{90\}[\s\S]*endAngle=\{-270\}/)
  })

  it('uses the full tag statistics for the word cloud and AC chart', () => {
    const source = readFileSync(new URL('./algo-profile-chart.tsx', import.meta.url), 'utf8')

    assert.match(
      source,
      /const allTagScores = data\.tagStats\?\.length \? data\.tagStats : data\.radar/,
    )
    assert.match(source, /const radarAll = allTagScores/)
    assert.doesNotMatch(source, /\.slice\(0,\s*36\)/)
  })
})
