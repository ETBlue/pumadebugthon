// The 「只看 [實證]」 filter (design 3.5). It hides AI content in lists.
// It only removes items. It keeps the order of the list it gets.
import type { Story } from '@/types'
import type { PickItem } from './opinion'

/** The URL search value that turns the filter on: ?evidence=1. */
export const EVIDENCE_PARAM = 'evidence'

/** True when the 我想要… or the 以便… cell of the story has the 實證 tag. */
export function hasEvidence(story: Story): boolean {
  return story.want.tag === '實證' || story.soThat.tag === '實證'
}

/** The stories with the 實證 tag (see hasEvidence). */
export function evidenceOnly(stories: Story[]): Story[] {
  return stories.filter(hasEvidence)
}

function evidenceIds(stories: Story[]): Set<string> {
  return new Set(evidenceOnly(stories).map((s) => s.id))
}

/** The pick items with at least one story that has the 實證 tag. stories are
 * the stories of the issue. */
export function evidencePickList(items: PickItem[], stories: Story[]): PickItem[] {
  const ids = evidenceIds(stories)
  return items.filter((i) => i.storyIds.some((id) => ids.has(id)))
}

/** The number of stories of the item that have the 實證 tag. */
export function evidenceCount(item: PickItem, stories: Story[]): number {
  const ids = evidenceIds(stories)
  return item.storyIds.filter((id) => ids.has(id)).length
}

/** True when the URL turns the filter on (evidence=1). */
export function isEvidenceOnly(params: URLSearchParams): boolean {
  return params.get(EVIDENCE_PARAM) === '1'
}

/** A copy of params with the filter on or off. Other values are kept. */
export function withEvidence(params: URLSearchParams, on: boolean): URLSearchParams {
  const next = new URLSearchParams(params)
  if (on) next.set(EVIDENCE_PARAM, '1')
  else next.delete(EVIDENCE_PARAM)
  return next
}

/** The search part for a link to another tab: "?evidence=1" when the filter
 * is on, else "". Other values (such as pick) are left out. */
export function evidenceSearch(params: URLSearchParams): string {
  return isEvidenceOnly(params) ? `?${EVIDENCE_PARAM}=1` : ''
}
