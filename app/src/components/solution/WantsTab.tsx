import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CellText } from '@/components/CellText'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Heading, type HeadingLevel } from '@/components/Heading'
import { LabelledSection } from '@/components/LabelledSection'
import { Markdown } from '@/components/Markdown'
import { targetLinkClass } from '@/components/styles'
import { TagBadge } from '@/components/TagBadge'
import { t } from '@/i18n/zh-TW'
import { crossWantCoverage } from '@/lib/crossIssue'
import { dataBasedWants, dataBasisFilterSearch } from '@/lib/dataBasis'
import { stakeholderTabPath, storyPath } from '@/lib/entityPaths'
import { solutionGroupCoverage, solutionWantCoverage, type WantCoverage } from '@/lib/solutionPage'
import { stakeholderName } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { CrossIssueFile, CrossSolution, IndexFile, IssueFile, Solution, Stakeholder, Story } from '@/types'
import { PartEmpty, SolutionPart, TwoColumns } from './Parts'

const tp = t.solutionPage
const tx = t.crossIssue

/** One want: the story ID (a link to the story page), the stakeholder (a
 * link to its 訴求 tab) and the 我想要… cell with its tag. */
function WantRow({ story, issueNumber, stakeholders }: { story: Story; issueNumber: number; stakeholders: Stakeholder[] }) {
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  return (
    <li className="rounded-md border p-3">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <Link to={storyPath(issueNumber, story.id)} className={cn(targetLinkClass, 'font-mono font-semibold')}>
          {story.id}
        </Link>
        <Link to={{ pathname: stakeholderTabPath(story.stakeholder, 'wants'), search }} className={targetLinkClass}>
          {stakeholderName(stakeholders, story.stakeholder)}
        </Link>
      </p>
      <p className="mt-1"><CellText cell={story.want} /></p>
    </li>
  )
}

/** A list of wants with its heading. With the filter on, only the wants
 * whose 我想要… cell is [實證] or [AI整理] (dataBasedWants). */
function WantList({ id, title, intro, stories, none, issueNumber, stakeholders, level }: {
  id: string
  title: string
  intro?: string
  stories: Story[]
  none: string
  issueNumber: number
  stakeholders: Stakeholder[]
  level: HeadingLevel
}) {
  const [dataBasedOnly] = useDataBasisFilter()
  const shown = dataBasedOnly ? dataBasedWants(stories) : stories
  return (
    <LabelledSection headingId={id}>
      <Heading level={level} id={id} className="text-xl font-bold">{title}</Heading>
      {intro && <p className="mt-1 text-sm text-muted-foreground">{intro}</p>}
      {shown.length === 0 ? (
        <div className="mt-3"><PartEmpty>{stories.length === 0 ? none : tp.wantsFilteredNone}</PartEmpty></div>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((s) => <WantRow key={s.id} story={s} issueNumber={issueNumber} stakeholders={stakeholders} />)}
        </ul>
      )}
    </LabelledSection>
  )
}

/** 「涵蓋的訴求」 and 「未涵蓋的訴求」 of one issue, side by side from `lg`
 * (decision 136). */
function WantCoverageParts({ wants, issueNumber, stakeholders, level = 3, idPrefix = 'solution-wants', showNotCovered = true }: {
  wants: WantCoverage
  issueNumber: number
  stakeholders: Stakeholder[]
  level?: HeadingLevel
  idPrefix?: string
  /** false for an issue that is not in the parts of a cross-issue solution. */
  showNotCovered?: boolean
}) {
  const common = { issueNumber, stakeholders, level }
  const covered = (
    <WantList
      {...common}
      id={`${idPrefix}-covered`}
      title={tp.coveredWantsHeading}
      stories={wants.covered}
      none={tp.coveredWantsNone}
    />
  )
  // With only the covered part, it keeps the full width (decision 136).
  if (!showNotCovered) return covered
  return (
    <TwoColumns>
      {covered}
      <WantList
        {...common}
        id={`${idPrefix}-not-covered`}
        title={tp.notCoveredWantsHeading}
        intro={tp.notCoveredWantsIntro}
        stories={wants.notCovered}
        none={tp.notCoveredWantsNone}
      />
    </TwoColumns>
  )
}

/** 涵蓋的相同訴求群組 (moved from the 總覽 tab, decision 103): each W group
 * with a covered story, 全部 or 部分, and its stakeholders. The filter does
 * not change it, as before. */
function GroupsPart({ index, issue, solution }: { index: IndexFile; issue: IssueFile; solution: Solution }) {
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  const groups = useMemo(() => solutionGroupCoverage(issue, solution), [issue, solution])
  const name = (id: string) => stakeholderName(index.stakeholders, id)
  return (
    <SolutionPart id="solution-groups" title={tp.groupsHeading}>
      {groups.length === 0 ? (
        <PartEmpty>{tp.groupsNone}</PartEmpty>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{tp.groupsIntro}</p>
          <ul className="mt-3 space-y-3">
            {groups.map(({ group: g, full, covered, stakeholders: members }) => (
              <li key={g.id} className="rounded-md border p-3">
                <p>
                  <span className="mr-2 font-mono font-semibold">{g.id}</span>
                  {g.tag && <TagBadge kind={g.tag} className="mr-1.5" />}
                  <Markdown text={g.summary} />
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-semibold">{full ? tp.groupFull : tp.groupPartial}</span>
                  {!full && <span className="ml-2 break-words text-muted-foreground">{tp.groupCovered(covered)}</span>}
                </p>
                <div className="mt-1 text-sm">
                  <span className="text-muted-foreground">{tp.groupMembers}</span>
                  <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {members.map((id) => (
                      <li key={id}>
                        <Link to={{ pathname: stakeholderTabPath(id, 'wants'), search }} className={targetLinkClass}>
                          {name(id)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </SolutionPart>
  )
}

/** The 訴求 tab of an issue solution (design 3.12, decision 103): the
 * 「只看有資料根據」 toggle, a short note on what a want is, 涵蓋的相同訴求群組,
 * then 「涵蓋的訴求」 and 「未涵蓋的訴求」. One want is one story. */
export function WantsTab({ index, issue, solution }: { index: IndexFile; issue: IssueFile; solution: Solution }) {
  const wants = useMemo(() => solutionWantCoverage(issue, solution), [issue, solution])
  return (
    <>
      <DataBasisToggle className="mb-6" />
      <p className="mb-6 text-sm text-muted-foreground">{tp.wantsIntro}</p>
      <div className="space-y-10">
        <GroupsPart index={index} issue={issue} solution={solution} />
        <WantCoverageParts wants={wants} issueNumber={issue.number} stakeholders={index.stakeholders} />
      </div>
    </>
  )
}

/** The 訴求 tab of a cross-issue solution (decision 103): one h3 per issue,
 * with the covered and the not covered wants of that issue. An issue that is
 * not in parts shows only its covered wants, with the same note as the 需求
 * tab. The cross-issue file has no W groups, so there is no 涵蓋的相同訴求群組. */
export function CrossWantsTab({ data, index, issues, solution }: {
  data: CrossIssueFile
  index: IndexFile
  issues: IssueFile[]
  solution: CrossSolution
}) {
  const coverage = useMemo(() => crossWantCoverage(data, solution, issues), [data, solution, issues])
  const title = (n: number) => {
    const issue = issues.find((i) => i.number === n)
    return issue ? t.issueCard.numberTitle(n, issue.title) : `#${n}`
  }
  return (
    <>
      <DataBasisToggle className="mb-6" />
      <p className="mb-6 text-sm text-muted-foreground">{tp.wantsIntro}</p>
      <div className="space-y-12">
        {coverage.map(({ issueNumber, inParts, wants }) => (
          <div key={issueNumber} className="border-t pt-6">
            <SolutionPart id={`cross-wants-issue-${issueNumber}`} title={title(issueNumber)}>
              {!inParts && <p className="mb-4 text-sm text-muted-foreground">{tx.wantsNotInPartsNote}</p>}
              <WantCoverageParts
                wants={wants}
                issueNumber={issueNumber}
                stakeholders={index.stakeholders}
                level={4}
                idPrefix={`cross-wants-${issueNumber}`}
                showNotCovered={inParts}
              />
            </SolutionPart>
          </div>
        ))}
      </div>
    </>
  )
}
