import type { AvailableIssueSummary, IndexFile, IssueFile } from '@/types'

/** What every tab of the issue page gets. */
export interface IssueTabProps {
  index: IndexFile
  summary: AvailableIssueSummary
  issue: IssueFile
  /** Numbers of the available issues, for the 「也出現在」 marks. */
  available: number[]
}

