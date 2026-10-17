// Order of stakeholder and story IDs (design 3.1: tree order or ID order).

const ID = /^([OI])(\d+)(?:-US(\d+))?$/

/** Compare two IDs: O before I, then the stakeholder number, then the story
 * number. "O01" < "O10" < "I01" < "I01-US01" < "I01-US02". Other strings
 * come last, in string order. */
export function compareIds(a: string, b: string): number {
  const ma = ID.exec(a)
  const mb = ID.exec(b)
  if (!ma || !mb) {
    if (ma) return -1
    if (mb) return 1
    return a < b ? -1 : a > b ? 1 : 0
  }
  if (ma[1] !== mb[1]) return ma[1] === 'O' ? -1 : 1
  const n = Number(ma[2]) - Number(mb[2])
  if (n !== 0) return n
  return Number(ma[3] ?? 0) - Number(mb[3] ?? 0)
}
