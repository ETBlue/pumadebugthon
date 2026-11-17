// The tabs of the need page #/needs/<key> (plan-needs.md, Task N4). Each tab
// reuses the parts of the other entity pages: StoryList, StakeholderCard,
// SolutionCard, CrossSolutionCard, ConflictView, CrossConflictCard and
// NeedCard.
import { Link, useSearchParams } from 'react-router'
import { CellText } from '@/components/CellText'
import { ConflictView } from '@/components/ConflictView'
import { DataBasisEmpty, DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { DateFields } from '@/components/DateFields'
import { Field } from '@/components/Field'
import { Markdown } from '@/components/Markdown'
import { NeedCard } from '@/components/NeedCard'
import { NeedPriority } from '@/components/NeedItem'
import { SolutionCard } from '@/components/SolutionCard'
import { CrossConflictCard } from '@/components/solution/ConflictsTab'
import { CrossSolutionCard } from '@/components/solution/CrossSolutionCard'
import { PartEmpty, SolutionPart } from '@/components/solution/Parts'
import { StakeholderCard } from '@/components/StakeholderCard'
import { StoryList } from '@/components/StoryList'
import { TagBadge } from '@/components/TagBadge'
import { cardGridClass, linkClass, targetLinkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { conflictFocusPath } from '@/lib/entityPaths'
import { tabPath } from '@/lib/issuePage'
import type { NeedPageView } from '@/lib/needPage'
import { needHasDataBasis } from '@/lib/needRecords'
import { findStakeholder } from '@/lib/stakeholders'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'

const tp = t.needPage

export interface NeedTabProps {
  index: IndexFile
  view: NeedPageView
}

/** 總覽: a short intro line, then the issue, 優先順序 and 理由 with their
 * tags, 解法涵蓋 when no solution covers the need (a W need says 這次不做,
 * as on the solution page, decision 50), the X-N label, and the dates. The
 * summary with its tag is the h1 of the band. 總覽 has no filter, so the
 * page is never empty with 只看有資料根據 on. */
export function OverviewTab({ view }: Pick<NeedTabProps, 'view'>) {
  const [params] = useSearchParams()
  const { item, issue } = view
  const { need } = item
  return (
    <div>
      <p className="text-sm leading-relaxed text-muted-foreground">{tp.intro}</p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Field label={tp.issue}>
          <Link to={{ pathname: tabPath(issue.number, 'overview'), search: dataBasisFilterSearch(params) }} className={linkClass}>
            {tp.issueValue(issue.number, issue.title)}
          </Link>
        </Field>
        <Field label={tp.priority}><NeedPriority need={need} /></Field>
        <Field label={tp.reason}><CellText cell={need.reason} /></Field>
        {item.solutions.length === 0 && (
          <Field label={tp.coverage}>
            <span className="text-muted-foreground">{need.priority === 'W' ? tp.coverageWontDo : tp.coverageNone}</span>
          </Field>
        )}
        {item.crossGroups.length > 0 && <Field label={tp.crossGroup}>{item.crossGroups.join('、')}</Field>}
        <DateFields added={need.added} updated={need.updated} />
      </dl>
    </div>
  )
}

/** 使用者故事: the stories of the need as story cards. 只看有資料根據 hides
 * the stories with no data basis, as in every story list (StoryList). */
export function StoriesTab({ index, view }: NeedTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  return (
    <>
      <DataBasisToggle className="mb-6" />
      <StoryList stories={view.item.stories} issue={view.issue} stakeholders={index.stakeholders} dataBasedOnly={dataBasedOnly} />
    </>
  )
}

/** 利害關係人: the stakeholders of its stories, in ID order, as compact
 * cards. The list does not change with 只看有資料根據, like the stakeholder
 * lists of the solution page (decision 49), so this tab has no toggle. */
export function StakeholdersTab({ index, view }: NeedTabProps) {
  return (
    <ul className={cardGridClass}>
      {view.item.stakeholders.map((id) => (
        <li key={id}>
          <StakeholderCard variant="compact" stakeholder={findStakeholder(index.stakeholders, id)} />
        </li>
      ))}
    </ul>
  )
}

/** 解法: the covering solutions, one part per way they cover the need (列為
 * 必須有, 列為應該有、可以有, 透過跨議題的共同需求), the issue solutions
 * before the X- solutions. With 只看有資料根據 on, the list shows only when
 * the need has a data basis (needHasDataBasis), the same rule as the
 * stakeholder page's 解法 tab. */
export function SolutionsTab({ index, view }: NeedTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  const n = view.issue.number
  return (
    <>
      <DataBasisToggle className="mb-6" />
      {dataBasedOnly && !needHasDataBasis(view.item) ? (
        <PartEmpty>{tp.solutionsFilteredNone}</PartEmpty>
      ) : (
        <div className="space-y-10">
          {view.solutionGroups.map((g) => (
            <SolutionPart key={g.part} id={`need-solutions-${g.part}`} title={tp.solutionParts[g.part]}>
              <p className="text-sm text-muted-foreground">{tp.solutionPartIntros[g.part]}</p>
              <ul className={`mt-3 ${cardGridClass}`}>
                {g.issue.map((sol) => (
                  <li key={sol.id}><SolutionCard variant="compact" solution={sol} issueNumber={n} showIssue /></li>
                ))}
                {g.cross.map((sol) => (
                  <li key={sol.code}><CrossSolutionCard solution={sol} issueTitles={index.issues} className="h-full" /></li>
                ))}
              </ul>
            </SolutionPart>
          ))}
        </div>
      )}
    </>
  )
}

/** 衝突: 本議題的衝突 (ConflictView, with a link to the conflict on the
 * issue's 衝突 tab) and 跨議題的衝突 (CrossConflictCard). An empty part is
 * left out. 只看有資料根據 hides the stories with no data basis in the
 * sides, as on the solution page. */
export function ConflictsTab({ index, view, issues, cross }: NeedTabProps & { issues: IssueFile[]; cross: CrossIssueFile | null }) {
  const [dataBasedOnly] = useDataBasisFilter()
  const n = view.issue.number
  return (
    <>
      <DataBasisToggle className="mb-6" />
      <div className="space-y-10">
        {view.issueConflicts.length > 0 && (
          <SolutionPart id="need-issue-conflicts" title={tp.issueConflictsHeading}>
            <p className="text-sm text-muted-foreground">{tp.issueConflictsIntro}</p>
            <ul className="mt-4 space-y-4">
              {view.issueConflicts.map((c) => (
                <li key={c.conflict.id}>
                  {/* focusTarget off: the same conflict ID is on the issue's 衝突 tab, not here. */}
                  <ConflictView
                    view={c}
                    issue={view.issue}
                    stakeholders={index.stakeholders}
                    dataBasedOnly={dataBasedOnly}
                    focusTarget={false}
                  />
                  <p className="mt-2 text-sm">
                    <Link to={conflictFocusPath(n, c.conflict.id, dataBasedOnly)} className={targetLinkClass}>
                      {tp.conflictLink(n, c.conflict.id)}
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          </SolutionPart>
        )}
        {cross !== null && view.crossConflicts.length > 0 && (
          <SolutionPart id="need-cross-conflicts" title={tp.crossConflictsHeading}>
            <p className="text-sm text-muted-foreground">{tp.crossConflictsIntro}</p>
            <ul className="mt-4 space-y-4">
              {view.crossConflicts.map((c) => (
                <li key={c.conflict.id}>
                  <CrossConflictCard view={c} data={cross} index={index} issues={issues} dataBasedOnly={dataBasedOnly} />
                </li>
              ))}
            </ul>
          </SolutionPart>
        )}
      </div>
    </>
  )
}

/** 其他議題的相同需求: one part per X-N group, with the group summary, then
 * the other needs of the group as need cards that link to their pages.
 * 只看有資料根據 keeps only the needs with a data basis (needHasDataBasis),
 * the same rule as the need list. */
export function SameNeedsTab({ index, view }: NeedTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  const title = (n: number) => index.issues.find((i) => i.number === n)?.title ?? ''
  return (
    <>
      <DataBasisToggle className="mb-6" />
      <div className="space-y-10">
        {view.sameNeeds.map(({ group, needs }) => {
          const shown = dataBasedOnly ? needs.filter(needHasDataBasis) : needs
          return (
            <SolutionPart key={group.id} id={`need-same-${group.id}`} title={`${tp.crossGroup} ${group.id}`}>
              <p className="leading-relaxed">
                {group.tag && <TagBadge kind={group.tag} className="mr-1.5" />}
                <Markdown text={group.summary} />
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{tp.sameNeedsIntro}</p>
              {shown.length === 0 ? (
                <DataBasisEmpty />
              ) : (
                <ul className={`mt-3 ${cardGridClass}`}>
                  {shown.map((item) => (
                    <li key={item.key}>
                      <NeedCard item={item} issueTitle={title(item.issue)} shareOn={false} dataBased={dataBasedOnly} />
                    </li>
                  ))}
                </ul>
              )}
            </SolutionPart>
          )
        })}
      </div>
    </>
  )
}
