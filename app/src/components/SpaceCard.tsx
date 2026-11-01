import type { IssueTitles } from '@/lib/issues'
import type { SpaceType } from '@/types'
import { TypeCard, type TypeCardCounts } from './TypeCard'

export type SpaceCardCounts = TypeCardCounts

/** One space type on #/spaces (design 3.9, decision 120): the type card
 * (TypeCard) with the kind 'space'. Since Task U3 the list page uses
 * TypeCard directly; this wrapper is kept for the tests. */
export function SpaceCard({ space, issues, titles, counts }: {
  space: SpaceType
  /** The numbers of the analyzed issues that use the space (issuesBySpace). */
  issues: number[]
  titles: IssueTitles
  counts: SpaceCardCounts | null
}) {
  return <TypeCard kind="space" type={space} issues={issues} titles={titles} counts={counts} />
}
