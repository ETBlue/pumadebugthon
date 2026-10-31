import { describe, expect, it } from 'vitest'
import { compareCodes, compareIds } from './ids'

describe('compareIds', () => {
  it('puts O before I, then orders by number', () => {
    expect(['I02', 'O10', 'I01', 'O02', 'O01'].sort(compareIds)).toEqual(['O01', 'O02', 'O10', 'I01', 'I02'])
  })

  it('orders story IDs by stakeholder, then story number', () => {
    expect(['I06-US02', 'O12-US01', 'I06-US01', 'I01-US04'].sort(compareIds)).toEqual([
      'O12-US01', 'I01-US04', 'I06-US01', 'I06-US02',
    ])
  })
})

describe('compareCodes (decision 151)', () => {
  it('compares the numbers inside a code as numbers: S2 before S10', () => {
    const codes = ['S12', 'S2', 'S10', 'S1', 'S11', 'S3', 'S9', 'S4', 'S8', 'S5', 'S7', 'S6']
    expect([...codes].sort(compareCodes)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'])
  })

  it('orders X-S and X-N codes by number', () => {
    expect(['X-S10', 'X-S2', 'X-S13', 'X-S1'].sort(compareCodes)).toEqual(['X-S1', 'X-S2', 'X-S10', 'X-S13'])
    expect(['X-N20', 'X-N10', 'X-N2', 'X-N1', 'X-N11'].sort(compareCodes)).toEqual(['X-N1', 'X-N2', 'X-N10', 'X-N11', 'X-N20'])
  })

  it('orders full IDs by issue number, then code number', () => {
    expect(['10-S1', '2-S10', '2-S2', '1-S11'].sort(compareCodes)).toEqual(['1-S11', '2-S2', '2-S10', '10-S1'])
  })
})

describe('compareIds with solution codes', () => {
  it('puts S2 before S10 (the solution lists use it)', () => {
    expect(['S10', 'S2', 'S1', 'S11'].sort(compareIds)).toEqual(['S1', 'S2', 'S10', 'S11'])
  })
})
