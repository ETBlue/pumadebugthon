// The 解法 and 利害關係人 tabs of the space page (design 3.6, decision 138).
// These are thin wrappers over the generic helpers in typeTabs.ts, with the
// kind 'space'. They keep the old names. Since Task U3 the type page
// (TypePage.tsx) calls typeTabs.ts directly; these names stay for the tests.
import type { IndexFile, IssueFile } from '@/types'
import type { ListState } from './listParams'
import type { RecentSolution } from './recent'
import {
  TYPE_TAB_PAGE, typeSolutionIssues, typeSolutionItems, typeSolutionsView, typeStakeholderIssues, typeStakeholdersView,
  typeTabFiltered, typeTabParams, type TypeListTab, type TypeStakeholdersView,
} from './typeTabs'

export { groupByIssue } from './typeTabs'

/** The page of each tab: its URL params, its sorts and its result line. */
export const SPACE_TAB_PAGE = TYPE_TAB_PAGE
export type SpaceListTab = TypeListTab
export type SpaceStakeholdersView = TypeStakeholdersView

/** The state of a space tab from the URL (see typeTabParams). */
export const spaceTabParams = typeTabParams

/** True when a filter or the search is on (the sort is not a filter). */
export const spaceTabFiltered = typeTabFiltered

/** The 解法 tab of the space page (see typeSolutionsView). */
export const spaceSolutionsView = typeSolutionsView

/** The solutions of the space as list items: by issue number, then by the
 * number of the code. */
export function spaceSolutionItems(issues: IssueFile[], code: string): RecentSolution[] {
  return typeSolutionItems('space', issues, code)
}

/** The issues that have a solution in the space, by number. */
export function spaceSolutionIssues(issues: IssueFile[], code: string): number[] {
  return typeSolutionIssues('space', issues, code)
}

/** The issues that have a stakeholder in the space, by number. */
export function spaceStakeholderIssues(issues: IssueFile[], code: string): number[] {
  return typeStakeholderIssues('space', issues, code)
}

/** The 利害關係人 tab of the space page (see typeStakeholdersView). */
export function spaceStakeholdersView(
  index: IndexFile,
  issues: IssueFile[],
  code: string,
  state: ListState,
): SpaceStakeholdersView {
  return typeStakeholdersView('space', index, issues, code, state)
}
