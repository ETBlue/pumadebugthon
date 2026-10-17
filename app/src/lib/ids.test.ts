import { describe, expect, it } from 'vitest'
import { compareIds } from './ids'

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
