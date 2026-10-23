import { useMemo } from 'react'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Heading, subLevel, type HeadingLevel } from '@/components/Heading'
import { LabelledSection } from '@/components/LabelledSection'
import { NeedItem, type NeedPart } from '@/components/NeedItem'
import { t } from '@/i18n/zh-TW'
import { priorityLabel } from '@/lib/priority'
import {
  coverageByPriority, dataBasedCoverage, solutionNeedCoverage, type CoveragePriorityGroup, type NeedCoverage,
} from '@/lib/solutionPage'
import type { NeedItem as NeedData } from '@/lib/needs'
import type { IssueFile, Solution, Stakeholder } from '@/types'
import { PartEmpty, TwoColumns } from './Parts'

const tp = t.solutionPage

/** The parts of a covered need: the summary links to the need on the
 * issue's 需求 tab, then the ID, the stakeholders and the stories. */
const COVERED_PARTS: readonly NeedPart[] = ['id', 'stakeholders', 'stories']
/** A not covered need also shows 「由其他解法涵蓋」. */
const NOT_COVERED_PARTS: readonly NeedPart[] = ['id', 'stakeholders', 'stories', 'solutions']

function PriorityGroups<T extends NeedData>({
  groups, idPrefix, level, issueNumber, solutionId, stakeholders, parts, focusTarget,
}: {
  groups: CoveragePriorityGroup<T>[]
  idPrefix: string
  level: HeadingLevel
  issueNumber: number
  solutionId: string
  stakeholders: Stakeholder[]
  parts: readonly NeedPart[]
  focusTarget: boolean
}) {
  return (
    <div className="mt-4 space-y-6">
      {groups.map((g) => (
        <LabelledSection key={g.priority} headingId={`${idPrefix}-${g.priority}`}>
          <Heading level={level} id={`${idPrefix}-${g.priority}`} className="font-semibold">
            {priorityLabel(g.priority)}
          </Heading>
          <ul className="mt-2 space-y-3">
            {g.items.map((item) => (
              <li key={item.need.id}>
                <NeedItem
                  item={item}
                  issueNumber={issueNumber}
                  stakeholders={stakeholders}
                  parts={parts}
                  headingLevel={subLevel(level)}
                  summaryLink
                  otherSolutionsThan={solutionId}
                  focusTarget={focusTarget}
                />
              </li>
            ))}
          </ul>
        </LabelledSection>
      ))}
    </div>
  )
}

export interface NeedCoveragePartsProps {
  /** The issue of the needs, for the links. */
  issueNumber: number
  /** The needs of this issue, split into covered and not covered
   * (solutionNeedCoverage, or the cross-issue version in Task N11). */
  coverage: NeedCoverage
  /** The code of the solution on the page ("A", or "X-A" for a cross-issue
   * solution). A not covered need lists the other solutions that cover it. */
  solutionId: string
  /** All stakeholders from index.json, for the names. */
  stakeholders: Stakeholder[]
  /** The level of the 「涵蓋的需求」 and 「未涵蓋的需求」 headings. Default 3
   * (under the hidden h2 of the tab). Use 4 under an issue h3 (Task N11). */
  headingLevel?: HeadingLevel
  /** A prefix for the heading IDs, so two lists on one page do not repeat
   * an ID (Task N11 has one list per issue). Default "solution-needs". */
  idPrefix?: string
  /** Give each need the element ID focus-<need key>, so ?focus=N01 works.
   * Default true. Set false when the same need key can show twice on the
   * page (several issues in Task N11). */
  focusTarget?: boolean
  /** Show 「未涵蓋的需求」. Default true. false for an issue that is not in
   * the parts of a cross-issue solution: it has only covered needs (design 3.18). */
  showNotCovered?: boolean
}

/** The two parts of the 需求 tab (design 3.12): 「涵蓋的需求」 grouped by the
 * need's priority and 「未涵蓋的需求」 grouped by priority, side by side
 * from `lg` (decision 136), each with the
 * other solutions that cover it. It follows the 「只看有資料根據」 setting in
 * the URL. The toggle itself is on the tab. */
export function NeedCoverageParts({
  issueNumber, coverage, solutionId, stakeholders, headingLevel = 3, idPrefix = 'solution-needs', focusTarget = true,
  showNotCovered = true,
}: NeedCoveragePartsProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  const groups = useMemo(() => coverageByPriority(dataBasedCoverage(coverage, dataBasedOnly)), [coverage, dataBasedOnly])
  const sub = subLevel(headingLevel)
  const common = { issueNumber, solutionId, stakeholders, level: sub, focusTarget }
  const emptyText = (all: number, noneText: string) => (all === 0 ? noneText : tp.needsFilteredNone)

  const covered = (
    <LabelledSection headingId={`${idPrefix}-covered`}>
      <Heading level={headingLevel} id={`${idPrefix}-covered`} className="text-xl font-bold">
        {tp.coveredNeedsHeading}
      </Heading>
      {groups.covered.length === 0 ? (
        <div className="mt-3"><PartEmpty>{emptyText(coverage.covered.length, tp.coveredNeedsNone)}</PartEmpty></div>
      ) : (
        <PriorityGroups {...common} groups={groups.covered} idPrefix={`${idPrefix}-covered`} parts={COVERED_PARTS} />
      )}
    </LabelledSection>
  )
  // An issue that is not in the parts of a cross-issue solution has only the
  // covered part. It keeps the full width (decision 136).
  if (!showNotCovered) return covered
  return (
    <TwoColumns>
      {covered}
      <LabelledSection headingId={`${idPrefix}-not-covered`}>
        <Heading level={headingLevel} id={`${idPrefix}-not-covered`} className="text-xl font-bold">
          {tp.notCoveredNeedsHeading}
        </Heading>
        <p className="mt-1 text-sm text-muted-foreground">{tp.notCoveredNeedsIntro}</p>
        {groups.notCovered.length === 0 ? (
          <div className="mt-3">
            <PartEmpty>{emptyText(coverage.notCovered.length, tp.notCoveredNeedsNone)}</PartEmpty>
          </div>
        ) : (
          <PriorityGroups
            {...common}
            groups={groups.notCovered}
            idPrefix={`${idPrefix}-not-covered`}
            parts={NOT_COVERED_PARTS}
          />
        )}
      </LabelledSection>
    </TwoColumns>
  )
}

/** The 需求 tab of an issue solution (design 3.12): the 「只看有資料根據」
 * toggle, then NeedCoverageParts. */
export function NeedsTab({ issue, solution, stakeholders }: {
  issue: IssueFile
  solution: Solution
  stakeholders: Stakeholder[]
}) {
  const coverage = useMemo(() => solutionNeedCoverage(issue, solution), [issue, solution])
  return (
    <>
      <DataBasisToggle className="mb-6" />
      <NeedCoverageParts issueNumber={issue.number} coverage={coverage} solutionId={solution.id} stakeholders={stakeholders} />
    </>
  )
}
