// The UI text of the type pages for each kind of type (Task U3). The
// generic list page (TypeList), type page (TypePage) and card (TypeCard)
// read their text from here, so one component serves all three kinds. The
// text itself is in zh-TW.ts.
import { t } from '@/i18n/zh-TW'
import type { TypeTab } from '@/lib/entityPaths'
import type { TabLabel } from '@/lib/tabLabel'
import type { TypeKind } from '@/lib/typeKinds'

/** The parts of a type page that every kind has. */
export interface TypePageText {
  notFoundTitle: string
  notFoundBody: (code: string) => string
  backHome: string
  intro: string
  issuesHeading: string
  issuesNone: string
  solutionsHeading: string
  solutionsNone: string
  /** Before the other types of the same kind on a solution card. */
  otherTypes: string
  stakeholdersHeading: string
  stakeholdersIntro: string
  stakeholdersNone: string
  sharedHeading: string
  sharedIntro: string
  sharedNone: string
  sharedIssues: string
  byIssueHeading: string
  tabsLabel: string
  tabs: Record<TypeTab, string>
  tabLabels: Record<Exclude<TypeTab, 'overview'>, (n: number) => TabLabel>
  tabNotFound: string
  goToOverview: string
  /** The back button to the list page. */
  back: string
}

/** The parts of a type list page and its cards that every kind has. */
export interface TypeListText {
  title: string
  issues: string
  stakeholders: string
  solutions: string
  issuesValue: (n: number) => string
  stakeholdersValue: (n: number) => string
  solutionsValue: (n: number) => string
  noIssues: string
  /** The 分類 filter. null for a kind with one level (solution types). */
  groupFilter: string | null
  issueFilter: string
  issueOption: (n: number, title: string) => string
  issueShort: (n: number) => string
  noun: string
  noMatchFilters: string
  clearSearch: string
}

export const TYPE_PAGE_TEXT: Record<TypeKind, TypePageText> = {
  space: { ...t.spacePage, back: t.backLink.spaces },
  domain: { ...t.domainPage, back: t.backLink.domains },
  solutionType: { ...t.solutionTypePage, back: t.backLink.solutionTypes },
}

export const TYPE_LIST_TEXT: Record<TypeKind, TypeListText> = {
  space: t.spacesList,
  domain: t.domainsList,
  solutionType: { ...t.solutionTypesList, groupFilter: null },
}

/** The prefix of the HTML ids on the type pages, for example
 * 「space-solutions-2」 and 「space-group-0」. */
export const TYPE_ID_PREFIX: Record<TypeKind, string> = {
  space: 'space',
  domain: 'domain',
  solutionType: 'solution-type',
}
