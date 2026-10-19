import { describe, expect, it } from 'vitest'
import { sectionLabelIds } from './sectionLabel'

describe('sectionLabelIds', () => {
  it('is the own heading ID for a section that is not inside another one', () => {
    expect(sectionLabelIds([], 'space-solutions')).toBe('space-solutions')
  })

  it('puts the heading IDs of the outer sections first, so two parts with the same title get different names', () => {
    // 「訴求」 of issue #1 and of issue #2 on the stakeholder page.
    expect(sectionLabelIds(['stakeholder-wants-1'], 'stakeholder-wants-1-wants')).toBe(
      'stakeholder-wants-1 stakeholder-wants-1-wants',
    )
    expect(sectionLabelIds(['cross-issue-1', 'cross-needs-1-covered'], 'cross-needs-1-covered-M')).toBe(
      'cross-issue-1 cross-needs-1-covered cross-needs-1-covered-M',
    )
  })

  it('does not repeat an ID', () => {
    expect(sectionLabelIds(['a', 'b'], 'b')).toBe('a b')
  })
})
