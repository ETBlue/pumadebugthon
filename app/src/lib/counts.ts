// The counts in the header (design 3.7). A count is a plain number, not a
// score. Nothing here sorts.
// wantCount and needCount are not in the header any more (decision 30). They
// stay for the 訴求 and 需求 tabs that human-inputs.md plans for the issue
// and stakeholder pages.
import type { IndexFile, IssueFile, Story } from '@/types'
import { availableIssues } from './issues'
import { pickList } from './opinion'

/** 議題: the analyzed issues. */
export function issueCount(index: IndexFile): number {
  return availableIssues(index).length
}

/** 利害關係人: active stakeholders. Moved IDs are left out. */
export function stakeholderCount(index: IndexFile): number {
  return index.stakeholders.filter((s) => s.movedTo === null).length
}

/** 解法: the solutions of the analyzed issues, summed. */
export function solutionCount(index: IndexFile): number {
  return availableIssues(index).reduce((n, i) => n + i.counts.solutions, 0)
}

/** 訴求: each W group once, plus each story with no W group. These are the
 * items of the opinion check pick list (design 4.1), summed over the issues.
 * Pass the files of the analyzed issues. */
export function wantCount(issues: IssueFile[]): number {
  return issues.reduce((n, issue) => n + pickList(issue).length, 0)
}

/** True when the story has a 以便… cell. A 【待補】 cell counts; an empty one does not. */
export function hasSoThat(story: Story): boolean {
  return story.soThat.text.trim() !== ''
}

/** 需求: one per story with a 以便… cell, summed over the issues. 以便…
 * cells have no groups, so two cells with the same text are two 需求.
 * Pass the files of the analyzed issues. */
export function needCount(issues: IssueFile[]): number {
  return issues.reduce((n, issue) => n + issue.stories.filter(hasSoThat).length, 0)
}
