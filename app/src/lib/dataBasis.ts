// The 「只看有資料根據」 filter (design 3.5). It hides [AI模擬] content in
// lists and keeps [實證] and [AI整理] content. It only removes items. It keeps
// the order of the list it gets.
import type { Story, Tag } from '@/types'
import type { PickItem } from './opinion'

/** The tags with data behind them: a checkable source ([實證]) or an AI
 * summary of real data ([AI整理]). [AI模擬] has no data behind it. */
export const DATA_BASED_TAGS: readonly Tag[] = ['實證', 'AI整理']

/** The URL search value that turns the filter on: ?evidence=1. The name is
 * from the time the filter kept only [實證]. It stays, so shared links still work. */
export const FILTER_PARAM = 'evidence'

/** True when the 我想要… or the 以便… cell of the story has a data-based tag
 * (實證 or AI整理). */
export function hasDataBasis(story: Story): boolean {
  return DATA_BASED_TAGS.includes(story.want.tag) || DATA_BASED_TAGS.includes(story.soThat.tag)
}

/** The stories with a data-based tag (see hasDataBasis). */
export function dataBasedOnly(stories: Story[]): Story[] {
  return stories.filter(hasDataBasis)
}

function dataBasedIds(stories: Story[]): Set<string> {
  return new Set(dataBasedOnly(stories).map((s) => s.id))
}

/** The pick items with at least one story that has a data-based tag.
 * stories are the stories of the issue. */
export function dataBasedPickList(items: PickItem[], stories: Story[]): PickItem[] {
  const ids = dataBasedIds(stories)
  return items.filter((i) => i.storyIds.some((id) => ids.has(id)))
}

/** The number of stories of the item that have a data-based tag. */
export function dataBasedCount(item: PickItem, stories: Story[]): number {
  const ids = dataBasedIds(stories)
  return item.storyIds.filter((id) => ids.has(id)).length
}

/** True when the URL turns the filter on (evidence=1). */
export function isDataBasisFilterOn(params: URLSearchParams): boolean {
  return params.get(FILTER_PARAM) === '1'
}

/** A copy of params with the filter on or off. Other values are kept. */
export function withDataBasisFilter(params: URLSearchParams, on: boolean): URLSearchParams {
  const next = new URLSearchParams(params)
  if (on) next.set(FILTER_PARAM, '1')
  else next.delete(FILTER_PARAM)
  return next
}

/** The search part for a link to another tab: "?evidence=1" when the filter
 * is on, else "". Other values (such as pick) are left out. */
export function dataBasisFilterSearch(params: URLSearchParams): string {
  return isDataBasisFilterOn(params) ? `?${FILTER_PARAM}=1` : ''
}
