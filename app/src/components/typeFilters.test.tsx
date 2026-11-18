// The group headings of the 空間類型 and 領域 filters (decision 225). A
// heading is a checkbox that picks every shown type of its group. The URL
// keeps the type codes, and the result line shows the group name when the
// whole group is picked.
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LIST_STATE, listUrlSearch, type ListState } from '@/lib/listParams'
import { issueTypeOptions } from '@/lib/typeKinds'
import indexJson from '@/test/fixtures/index.json'
import type { IndexFile } from '@/types'
import { ChoiceList, choiceGroups, groupPickState, pickChoices, type ListBarFilter } from './ListBar'
import { typeChoiceFilter, typeFilterPart } from './typeFilters'

const index = indexJson as IndexFile
const STATE: ListState = { ...DEFAULT_LIST_STATE, issues: [], spaces: [] }
type Choices = Extract<ListBarFilter, { kind: 'choices' }>

/** The 空間類型 options of #/issues with the fixtures:
 * 道路: sidewalk-furniture, arcade, bike-lane, bus-stop; 地下: utility;
 * 公共空間: park, mrt-exit; 建築: indoor-home. */
const spaceOptions = issueTypeOptions('space', index, [])
const ROAD = ['sidewalk-furniture', 'arcade', 'bike-lane', 'bus-stop']

function spaceFilter(spaces: string[]): Choices {
  return typeChoiceFilter('space', '空間類型', spaceOptions, { ...STATE, spaces }, index) as Choices
}

describe('typeChoiceFilter groups', () => {
  it('gives each option its group, and the groups with a shown option in file order', () => {
    const f = spaceFilter([])
    expect(f.groups).toEqual([
      { value: 'road', label: '道路' },
      { value: 'underground', label: '地下' },
      { value: 'public-space', label: '公共空間' },
      { value: 'building', label: '建築' },
    ])
    expect(f.options.find((o) => o.value === 'park')?.group).toBe('public-space')
    // The option order stays the order given.
    expect(f.options.map((o) => o.value)).toEqual(spaceOptions.map((o) => o.code))
  })

  it('leaves out a group with no shown option', () => {
    const f = typeChoiceFilter('space', '空間類型', spaceOptions.filter((o) => o.code === 'park'), STATE, index) as Choices
    expect(f.groups).toEqual([{ value: 'public-space', label: '公共空間' }])
  })

  it('gives 領域 its groups too', () => {
    const options = issueTypeOptions('domain', index, [])
    const f = typeChoiceFilter('domain', '領域', options, STATE, index) as Choices
    expect(f.groups?.length).toBeGreaterThan(0)
    expect(f.groups?.[0]).toEqual({ value: 'general-affairs', label: '一般政務' })
  })

  it('has no groups for 解法類型, and none when the index has no groups', () => {
    const st = typeChoiceFilter('solutionType', '解法類型', index.solutionTypes.slice(0, 3), STATE, index) as Choices
    expect(st.groups).toBeUndefined()
    expect(st.options.every((o) => o.group === undefined)).toBe(true)
    const noGroups = { ...index, spaceGroups: undefined } as unknown as IndexFile
    const f = typeChoiceFilter('space', '空間類型', spaceOptions, STATE, noGroups) as Choices
    expect(f.groups).toBeUndefined()
    expect(choiceGroups(f).loose.length).toBe(spaceOptions.length)
  })
})

describe('group heading', () => {
  it('picks every shown option of the group, in option order', () => {
    const f = spaceFilter(['park'])
    const next = pickChoices(f, ROAD, true)
    expect(next).toEqual([...ROAD, 'park'])
  })

  it('unpicks every option of the group and keeps the others', () => {
    const f = spaceFilter([...ROAD, 'park'])
    expect(pickChoices(f, ROAD, false)).toEqual(['park'])
  })

  it('is checked when all are picked, mixed when some are, and off when none are', () => {
    expect(groupPickState(spaceFilter(ROAD), ROAD)).toBe('all')
    expect(groupPickState(spaceFilter(['arcade']), ROAD)).toBe('some')
    expect(groupPickState(spaceFilter(['park']), ROAD)).toBe('none')
  })

  it('keeps the type codes in the URL, with no group param', () => {
    const f = spaceFilter([])
    const search = listUrlSearch('issues', f.next(pickChoices(f, ROAD, true)))
    expect(search).toBe(`?${ROAD.map((c) => `space=${c}`).join('&')}`)
    expect(search).not.toContain('road')
    for (const page of ['needs', 'solutions'] as const) {
      expect(listUrlSearch(page, { ...STATE, spaces: ROAD })).not.toContain('=road')
    }
  })
})

describe('ChoiceList markup', () => {
  const render = (f: Choices) => renderToStaticMarkup(<ChoiceList filter={f} onPick={() => {}} />)
  /** The labels of the checkboxes, in DOM order. */
  const labels = (html: string) => [...html.matchAll(/<input[^>]*\/>([^<]+)<\/label>/g)].map((m) => m[1])

  it('shows the group headings as checkboxes, each with its options under it', () => {
    const html = render(spaceFilter([]))
    expect(labels(html)).toEqual([
      '道路', '人行道設施帶', '騎樓', '單車道', '公車站與候車亭',
      '地下', '地下管線',
      '公共空間', '公園綠地', '捷運站出口與周邊',
      '建築', '住家',
    ])
    // Every checkbox has its own label (htmlFor = id).
    const ids = [...html.matchAll(/<input[^>]*id="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(ids).size).toBe(12)
    for (const id of ids) expect(html).toContain(`for="${id}"`)
    // The options of a group are in a nested list.
    expect(html.match(/<ul class="space-y-0.5 pl-6">/g)?.length).toBe(4)
  })

  it('checks the heading when the whole group is picked', () => {
    const html = render(spaceFilter(ROAD))
    expect(html).toMatch(/<input[^>]*checked=""[^>]*\/>道路</)
    const partly = render(spaceFilter(['arcade']))
    expect(partly).not.toMatch(/<input[^>]*checked=""[^>]*\/>道路</)
  })

  it('stays a flat list for a filter whose options have no group', () => {
    const f: Choices = {
      kind: 'choices', key: 'priority', label: '優先順序',
      options: [{ value: 'M', label: 'Must' }, { value: 'S', label: 'Should' }],
      value: ['M'], next: () => STATE,
    }
    const html = render(f)
    expect(labels(html)).toEqual(['Must', 'Should'])
    expect(html).not.toContain('pl-6')
    expect(pickChoices(f, ['S'], true)).toEqual(['M', 'S'])
  })
})

describe('typeFilterPart', () => {
  const part = (spaces: string[], options = spaceOptions) =>
    typeFilterPart('space', '空間類型', index, { ...STATE, spaces }, options)

  it('shows the group name when every shown option of the group is picked', () => {
    expect(part([...ROAD, 'park'])).toBe('空間類型：道路、公園綠地')
  })

  it('shows the type names when only some of the group are picked', () => {
    expect(part(['arcade', 'bike-lane'])).toBe('空間類型：騎樓、單車道')
  })

  it('keeps the type name for a group with one shown option', () => {
    // 地下 shows only 地下管線 on #/issues.
    expect(part(['utility'])).toBe('空間類型：地下管線')
  })

  it('shows the type names when it does not get the options', () => {
    expect(typeFilterPart('space', '空間類型', index, { ...STATE, spaces: ROAD })).toBe('空間類型：人行道設施帶、騎樓、單車道、公車站與候車亭')
  })

  it('is null when the filter is off', () => {
    expect(part([])).toBeNull()
  })
})
