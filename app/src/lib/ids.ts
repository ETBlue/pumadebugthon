// Order of stakeholder and story IDs (design 3.1: tree order or ID order),
// and of solution and need codes (design decision 151).

const ID = /^([OI])(\d+)(?:-US(\d+))?$/

/** Compare two codes so that the numbers inside them compare as numbers:
 * "S2" < "S10", "X-S2" < "X-S10", "X-N2" < "X-N10", "1-S2" < "1-S10" < "2-S1".
 * The solution and need codes have no zero padding (ETBlue, 2026-10-31;
 * design decision 151), so text order would put S10 before S2. The other
 * parts compare as text. */
export function compareCodes(a: string, b: string): number {
  const pa = a.match(/\d+|\D+/g) ?? []
  const pb = b.match(/\d+|\D+/g) ?? []
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
    const x = pa[i]
    const y = pb[i]
    if (/^\d/.test(x) && /^\d/.test(y)) {
      const d = Number(x) - Number(y)
      if (d !== 0) return d
    } else if (x !== y) {
      return x < y ? -1 : 1
    }
  }
  if (pa.length !== pb.length) return pa.length - pb.length
  return a < b ? -1 : a > b ? 1 : 0
}

/** Compare two IDs: O before I, then the stakeholder number, then the story
 * number. "O01" < "O10" < "I01" < "I01-US01" < "I01-US02". Other strings
 * (solution codes S1, S2 …, need IDs N01 …) come last, in compareCodes
 * order, so S2 comes before S10. */
export function compareIds(a: string, b: string): number {
  const ma = ID.exec(a)
  const mb = ID.exec(b)
  if (!ma || !mb) {
    if (ma) return -1
    if (mb) return 1
    return compareCodes(a, b)
  }
  if (ma[1] !== mb[1]) return ma[1] === 'O' ? -1 : 1
  const n = Number(ma[2]) - Number(mb[2])
  if (n !== 0) return n
  return Number(ma[3] ?? 0) - Number(mb[3] ?? 0)
}
