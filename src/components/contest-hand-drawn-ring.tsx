import { cn } from '@/lib/utils'

/** 由日期字符串生成稳定伪随机，让每天圈圈略有不同 */
function seedFromKey(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * 手绘风格圈圈：双层略不规则椭圆 + 轻微旋转/位移。
 * 叠在日历格子上，标出「这一天有比赛」。
 */
export function ContestHandDrawnRing({
  dayKey,
  active,
  className,
}: {
  /** 如 2026-07-19，用于固定形变 */
  dayKey: string
  /** 选中日时加深描边 */
  active?: boolean
  className?: string
}) {
  const s = seedFromKey(dayKey)
  const rot = ((s % 13) - 6) * 0.9
  const sx = 1.02 + ((s >> 4) % 5) * 0.012
  const sy = 1.04 + ((s >> 8) % 5) * 0.01
  const dx = ((s >> 12) % 5) - 2
  const dy = ((s >> 16) % 5) - 2
  // 控制点轻微偏移，避免完美圆
  const wobble = (n: number) => ((s >> n) % 7) - 3

  const pathOuter = [
    `M ${48 + wobble(1)} ${10 + wobble(2)}`,
    `C ${74 + wobble(3)} ${12 + wobble(4)}, ${90 + wobble(5)} ${30 + wobble(6)}, ${90 + wobble(7)} ${50 + wobble(8)}`,
    `C ${92 + wobble(9)} ${74 + wobble(10)}, ${72 + wobble(11)} ${92 + wobble(12)}, ${50 + wobble(13)} ${90 + wobble(14)}`,
    `C ${26 + wobble(15)} ${92 + wobble(16)}, ${8 + wobble(17)} ${72 + wobble(18)}, ${10 + wobble(19)} ${48 + wobble(20)}`,
    `C ${10 + wobble(21)} ${24 + wobble(22)}, ${28 + wobble(23)} ${8 + wobble(24)}, ${48 + wobble(1)} ${10 + wobble(2)}`,
    'Z',
  ].join(' ')

  const pathInner = [
    `M ${50 + wobble(3)} ${16 + wobble(5)}`,
    `C ${70 + wobble(7)} ${18 + wobble(9)}, ${84 + wobble(11)} ${34 + wobble(13)}, ${84 + wobble(15)} ${50 + wobble(17)}`,
    `C ${86 + wobble(19)} ${70 + wobble(21)}, ${68 + wobble(23)} ${84 + wobble(1)}, ${50 + wobble(3)} ${84 + wobble(5)}`,
    `C ${32 + wobble(7)} ${86 + wobble(9)}, ${16 + wobble(11)} ${68 + wobble(13)}, ${16 + wobble(15)} ${50 + wobble(17)}`,
    `C ${14 + wobble(19)} ${32 + wobble(21)}, ${32 + wobble(23)} ${14 + wobble(1)}, ${50 + wobble(3)} ${16 + wobble(5)}`,
    'Z',
  ].join(' ')

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 size-full overflow-visible',
        active ? 'text-primary' : 'text-primary/75',
        className,
      )}
      style={{
        transform: `translate(${dx}%, ${dy}%) rotate(${rot}deg) scale(${sx}, ${sy})`,
      }}
    >
      {/* 外圈略粗、内圈淡一笔，模拟手绘双描边 */}
      <path
        d={pathOuter}
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 4.2 : 3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.92}
      />
      <path
        d={pathInner}
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.38}
      />
    </svg>
  )
}
