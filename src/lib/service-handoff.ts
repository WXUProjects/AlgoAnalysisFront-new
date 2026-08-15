export interface ServiceQaTurn {
  question: string
  answer: string
}

export function serializeServiceHandoff(
  turns: ServiceQaTurn[],
  maxTurns = 15,
  maxLength = 10000,
): string {
  const serialized = turns
    .filter((turn) => turn.question.trim() && turn.answer.trim())
    .slice(-maxTurns)
    .map((turn) => `用户：${turn.question}\nQA：${turn.answer}`)

  const selected: string[] = []
  let length = 0
  for (let index = serialized.length - 1; index >= 0; index -= 1) {
    const turn = serialized[index]
    const nextLength = length + turn.length + (selected.length > 0 ? 1 : 0)
    if (nextLength > maxLength) break
    selected.unshift(turn)
    length = nextLength
  }
  return selected.join('\n')
}
