// URL paths of the entity pages: stakeholder, story, solution and space
// (design 3.3, 3.6, 3.12, 3.15, 3.16, 3.19). Wants and needs have no page of
// their own (decision 45). A link to one goes to the issue tab with ?focus=.
import { withDataBasisFilter } from './dataBasis'
import { FOCUS_PARAM } from './focus'
import { tabPath, type IssueTab } from './issuePage'
import { keptSearch } from './stakeholderFilter'

/** The tabs of the stakeholder page, in display order. The first one is the
 * default. 衝突 has its own tab after 需求 (decision 142). 議題 comes right
 * after 總覽 (decision 145). */
export const STAKEHOLDER_TABS = ['overview', 'issues', 'wants', 'needs', 'conflicts', 'solutions'] as const

export type StakeholderTab = (typeof STAKEHOLDER_TABS)[number]

/** The tabs of the solution page, in display order. The first one is the
 * default (design 3.12, decisions 103, 140, 142 and 143). The order of 利害關係人,
 * 訴求, 需求 and 衝突 is the same as on the issue page (decision 142). A
 * cross-issue solution has the same tabs. */
export const SOLUTION_TABS = [
  'overview', 'stakeholders', 'wants', 'needs', 'conflicts', 'plan', 'measures', 'risks', 'controversies', 'legal', 'policies',
] as const

export type SolutionTab = (typeof SOLUTION_TABS)[number]

/** A link target for react-router: a path and a search part ("" or "?…"). */
export interface PathTarget {
  pathname: string
  search: string
}

/** The stakeholder tab of the URL segment. No segment is the overview. An
 * unknown name returns null. "stories" is a sub-page, not a tab, so it is null too. */
export function parseStakeholderTab(segment: string | undefined): StakeholderTab | null {
  if (segment === undefined) return 'overview'
  return (STAKEHOLDER_TABS as readonly string[]).includes(segment) ? (segment as StakeholderTab) : null
}

/** The URL path of a stakeholder tab, for example "/stakeholders/I06/wants".
 * The overview has no tab segment: "/stakeholders/I06". */
export function stakeholderTabPath(id: string, tab: StakeholderTab): string {
  return tab === 'overview' ? `/stakeholders/${id}` : `/stakeholders/${id}/${tab}`
}

/** The URL path of a story page, for example
 * "/stakeholders/I06/stories/2/I06-US01". The stakeholder is the part of the
 * story ID before 「-」. */
export function storyPath(issueNumber: number, storyId: string): string {
  return `/stakeholders/${storyId.split('-')[0]}/stories/${issueNumber}/${storyId}`
}

const STORY_ID = /^[OI]\d+-US\d+$/

/** The story page of a want key or a need key, when the key is a story ID
 * (a want or need with no group, for example "I01-US09"). null for a group
 * key (W08, N07) or any other value. Every story ID links to its story page
 * (decision 55). */
export function keyStoryPath(issueNumber: number, key: string): string | null {
  return STORY_ID.test(key) ? storyPath(issueNumber, key) : null
}

/** A link to one part of an issue tab with ?focus=<value> (design 3.2,
 * decision 53), for example { pathname: "/issues/2/stakeholders", search: "?focus=stakeholders" }.
 * The last argument is either dataBasedOnly (adds evidence=1), or the
 * params of the current URL: then evidence and stakeholder are kept, the
 * same as a tab change (keptSearch), and pick and the old focus are dropped. */
export function issueFocusPath(
  issueNumber: number,
  tab: IssueTab,
  value: string,
  filters: boolean | URLSearchParams = false,
): PathTarget {
  const params =
    typeof filters === 'boolean'
      ? withDataBasisFilter(new URLSearchParams({ [FOCUS_PARAM]: value }), filters)
      : new URLSearchParams(keptSearch(filters))
  if (typeof filters !== 'boolean') params.set(FOCUS_PARAM, value)
  return { pathname: tabPath(issueNumber, tab), search: `?${params.toString()}` }
}

/** A link to one conflict on the issue's 衝突 tab, for example
 * { pathname: "/issues/2/conflicts", search: "?focus=C9" } (design 3.2,
 * decision 142; before, the conflicts were on the 訴求 tab).
 * The third argument is either dataBasedOnly (adds evidence=1), or the
 * params of the current URL: then evidence and stakeholder are kept, the
 * same as a tab change (keptSearch), and pick and the old focus are dropped. */
export function conflictFocusPath(
  issueNumber: number,
  conflictId: string,
  filters: boolean | URLSearchParams = false,
): PathTarget {
  return issueFocusPath(issueNumber, 'conflicts', conflictId, filters)
}

/** A link to one want on the issue's 訴求 tab, for example
 * { pathname: "/issues/2/wants", search: "?focus=W08" } (decision 57).
 * With dataBasedOnly, the search also has evidence=1. */
export function wantFocusPath(issueNumber: number, key: string, dataBasedOnly = false): PathTarget {
  return issueFocusPath(issueNumber, 'wants', key, dataBasedOnly)
}

/** A link to one need on the issue's 需求 tab, for example
 * { pathname: "/issues/2/needs", search: "?focus=N07" } (decision 57).
 * The last argument works as in issueFocusPath. */
export function needFocusPath(issueNumber: number, key: string, filters: boolean | URLSearchParams = false): PathTarget {
  return issueFocusPath(issueNumber, 'needs', key, filters)
}

/** The solution tab of the URL segment. No segment is the overview. An
 * unknown name returns null. */
export function parseSolutionTab(segment: string | undefined): SolutionTab | null {
  if (segment === undefined) return 'overview'
  return (SOLUTION_TABS as readonly string[]).includes(segment) ? (segment as SolutionTab) : null
}

function withTab(base: string, tab: string | undefined): string {
  return tab === undefined || tab === 'overview' ? base : `${base}/${tab}`
}

/** The URL path of the solution page of an issue, for example
 * "/solutions/2-A" or "/solutions/2-A/needs". The overview has no tab segment. */
export function solutionPath(issueNumber: number, code: string, tab?: SolutionTab): string {
  return withTab(`/solutions/${issueNumber}-${code}`, tab)
}

/** The URL path of a cross-issue solution page. code is the code as
 * cross-issue.json writes it, for example "X-A": "/solutions/X-A",
 * "/solutions/X-A/stakeholders". */
export function crossSolutionPath(code: string, tab?: SolutionTab): string {
  return withTab(`/solutions/${code}`, tab)
}

export type SolutionSlug = { kind: 'issue'; issueNumber: number; code: string } | { kind: 'cross'; code: string }

/** The solution of the path segment (design 3.12): "2-A" is solution A of
 * issue #2, "X-A" is a cross-issue solution. The issue number is a plain
 * positive number (not "02"). The code is one capital letter. Anything else
 * returns null. */
export function parseSolutionSlug(segment: string | undefined): SolutionSlug | null {
  if (segment === undefined) return null
  const cross = /^X-[A-Z]$/.exec(segment)
  if (cross) return { kind: 'cross', code: segment }
  const m = /^([1-9]\d*)-([A-Z])$/.exec(segment)
  if (!m) return null
  return { kind: 'issue', issueNumber: Number(m[1]), code: m[2] }
}

/** The tabs of the space page, in display order. The first one is the
 * default (design 3.6, decision 129). */
export const SPACE_TABS = ['overview', 'issues', 'solutions', 'stakeholders'] as const

export type SpaceTab = (typeof SPACE_TABS)[number]

/** The space tab of the URL segment. No segment is the overview, so an old
 * link to "/spaces/sidewalk" opens the first tab. An unknown name returns null. */
export function parseSpaceTab(segment: string | undefined): SpaceTab | null {
  if (segment === undefined) return 'overview'
  return (SPACE_TABS as readonly string[]).includes(segment) ? (segment as SpaceTab) : null
}

/** The URL path of a space tab, for example "/spaces/sidewalk/solutions".
 * The overview has no tab segment: "/spaces/sidewalk". */
export function spaceTabPath(code: string, tab: SpaceTab): string {
  return withTab(`/spaces/${code}`, tab)
}
