export function parseMark(
  value: string,
  maximum: number | null
): { score: number | null; error?: string } {
  if (value.trim() === "") return { score: null }
  const score = Number(value)
  if (maximum === null)
    return {
      score: null,
      error:
        "This assessment has no mark range. Ask your school administrator.",
    }
  if (!Number.isFinite(score) || score < 0 || score > maximum)
    return {
      score: null,
      error: `Enter a mark from 0 to ${maximum}, or leave it blank.`,
    }
  return { score }
}
export function nextGradeRow(
  current: number,
  key: string,
  count: number,
  shift = false
) {
  if (count === 0) return 0
  const direction = key === "ArrowUp" || (key === "Tab" && shift) ? -1 : 1
  return Math.max(0, Math.min(count - 1, current + direction))
}
