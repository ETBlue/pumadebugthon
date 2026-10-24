import { useId, useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { BasisField } from '@/components/BasisField'
import { DateFields } from '@/components/DateFields'
import { Field } from '@/components/Field'
import { LabelledSection } from '@/components/LabelledSection'
import { AlsoInLine } from '@/components/issue/AlsoIn'
import { IssueCardGrid } from '@/components/IssueCardGrid'
import { IssueTitleLinks } from '@/components/IssueTitleLinks'
import type { ListBarFilter } from '@/components/ListBar'
import { LoadState } from '@/components/LoadState'
import { PageBand, PageBody } from '@/components/PageBand'
import { PageTabs } from '@/components/PageTabs'
import { CoveredBasisField, SolutionCard } from '@/components/SolutionCard'
import { SpaceLinks } from '@/components/SpaceLinks'
import { SpaceTabMenu, useSpaceTabState } from '@/components/SpaceTabMenu'
import { ResultLine } from '@/components/ResultLine'
import { StakeholderPicker } from '@/components/StakeholderPicker'
import { StakeholderCard } from '@/components/StakeholderCard'
import { cardGridClass, linkClass } from '@/components/styles'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { PageTitle } from '@/components/PageTitle'
import { backListPath } from '@/lib/backLink'
import { solutionCells, stakeholderCells } from '@/lib/coverage'
import { parseSpaceTab, SPACE_TABS, spaceTabPath, type SpaceTab } from '@/lib/entityPaths'
import { availableIssues } from '@/lib/issues'
import {
  findSpaceType, issuesBySpace, otherSpaces, solutionsBySpace, spaceStakeholderCount, stakeholdersBySpace,
} from '@/lib/spaces'
import type { ListState } from '@/lib/listParams'
import {
  groupByIssue, spaceSolutionIssues, spaceSolutionItems, spaceSolutionsView, spaceStakeholderIssues,
  spaceStakeholdersView, spaceTabFiltered,
} from '@/lib/spaceTabs'
import { findStakeholder } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { TabLabel } from '@/lib/tabLabel'
import type { AvailableIssueSummary, IndexFile, IssueFile, SpaceType } from '@/types'

const tp = t.spacePage

/** Space page (design 3.6): #/spaces/:code/:tab? with four tabs (decision
 * 129): 總覽, 議題, 解法 and 利害關係人. City space is limited, so this page
 * lists what competes for the same space. The band has the back button to
 * the space list #/spaces (decision 120; before: the issue list, decision
 * 111). */
export default function Space() {
  const index = useIndex()
  const { code = '' } = useParams()
  if (index.status !== 'ready') return <PageBody><LoadState state={index} /></PageBody>

  const space = findSpaceType(index.data.spaceTypes, code)
  if (!space) {
    return (
      <PageBody>
        <PageTitle parts={[tp.notFoundTitle]} />
        <h1 className="text-2xl font-bold">{tp.notFoundTitle}</h1>
        <p className="mt-3">{tp.notFoundBody(code)}</p>
        <p className="mt-3">
          <Link to="/" className={linkClass}>{tp.backHome}</Link>
        </p>
      </PageBody>
    )
  }
  return <SpaceContent key={code} index={index.data} space={space} />
}

/** The counts of the 解法 and 利害關係人 tabs. */
type SpaceCounts = { solutions: number; stakeholders: number }

/** The tab label with its count. 議題 needs only index.json. 解法 and
 * 利害關係人 need the issue files: while they load, the name only. */
function tabLabel(tab: SpaceTab, issueCount: number, c: SpaceCounts | null): TabLabel {
  if (tab === 'overview') return { main: tp.tabs.overview }
  if (tab === 'issues') return tp.tabLabels.issues(issueCount)
  if (c === null) return { main: tp.tabs[tab] }
  return tp.tabLabels[tab](c[tab])
}

/** The hidden h2 of each tab: the heading of the section it replaces. */
const TAB_HEADINGS: Record<SpaceTab, string> = {
  overview: tp.tabs.overview,
  issues: tp.issuesHeading,
  solutions: tp.solutionsHeading,
  stakeholders: tp.stakeholdersHeading,
}

function SpaceContent({ index, space }: { index: IndexFile; space: SpaceType }) {
  const summaries = useMemo(() => issuesBySpace(index, space.code), [index, space.code])
  const folders = useMemo(() => summaries.map((i) => i.folder), [summaries])
  const issues = useIssues(folders)
  const tab = parseSpaceTab(useParams().tab)
  // The same helpers as the card on #/spaces, so the numbers match.
  const counts = useMemo<SpaceCounts | null>(() => {
    if (summaries.length === 0) return { solutions: 0, stakeholders: 0 }
    if (issues.status !== 'ready') return null
    return {
      solutions: solutionsBySpace(issues.data, space.code).length,
      stakeholders: spaceStakeholderCount(stakeholdersBySpace(issues.data, space.code)),
    }
  }, [summaries, issues, space.code])

  /** The 解法 and 利害關係人 tabs need the issue files. */
  const withIssues = (none: string, body: (files: IssueFile[]) => ReactNode) => {
    if (summaries.length === 0) return <p>{none}</p>
    if (issues.status !== 'ready') return <LoadState state={issues} />
    return body(issues.data)
  }

  const content = (name: SpaceTab) => {
    if (name === 'overview') return <SpaceOverview space={space} />
    if (name === 'issues') return <IssuesTab index={index} summaries={summaries} />
    if (name === 'solutions') {
      return withIssues(tp.solutionsNone, (files) => <SolutionsTab index={index} code={space.code} issues={files} />)
    }
    return withIssues(tp.stakeholdersNone, (files) => <StakeholdersTab index={index} code={space.code} issues={files} />)
  }

  return (
    <>
      {/* The overview is the space page itself, so its title has no tab name. */}
      <PageTitle parts={[space.name, tab && tab !== 'overview' ? tp.tabs[tab] : null]} />
      <PageBand back={{ to: backListPath('spaces'), label: t.backLink.spaces }}>{space.name}</PageBand>
      <PageBody>
        <PageTabs
          label={tp.tabsLabel}
          tabs={SPACE_TABS}
          current={tab}
          nameOf={(name) => TAB_HEADINGS[name]}
          labelOf={(name) => tabLabel(name, summaries.length, counts)}
          pathOf={(name) => spaceTabPath(space.code, name)}
          notFound={tp.tabNotFound}
          overviewPath={spaceTabPath(space.code, 'overview')}
          overviewLink={tp.goToOverview}
          scrollOnPhone
        >
          {content}
        </PageTabs>
      </PageBody>
    </>
  )
}

/** The 總覽 tab: 分組, 說明 and the intro line. It needs only index.json. */
function SpaceOverview({ space }: { space: SpaceType }) {
  return (
    <>
      <dl className="space-y-1.5 text-sm">
        <Field label={tp.group}>{space.group}</Field>
        {space.description && <Field label={tp.description}>{space.description}</Field>}
        {/* The dates of the space type itself (decision 131). */}
        <DateFields added={space.added} updated={space.updated} />
      </dl>
      <p className="mt-4 leading-relaxed">{tp.intro}</p>
    </>
  )
}

/** The 議題 tab: the issues that use the space, as compact cards in the
 * card grid of the tabs (cardGridClass, decision 138). The stakeholder page
 * used the same IssueCardGrid from decision 145 until decision 147. */
function IssuesTab({ index, summaries }: { index: IndexFile; summaries: AvailableIssueSummary[] }) {
  if (summaries.length === 0) return <p>{tp.issuesNone}</p>
  return <IssueCardGrid index={index} issues={summaries} />
}

/** 「#2 找回消失的垃圾桶」: the heading of the group of one issue. */
const issueTitle = (issues: IssueFile[], n: number) =>
  t.issueCard.numberTitle(n, issues.find((i) => i.number === n)?.title ?? '')

/** The 議題 filter of a space tab: one choice per issue of the tab, with
 * its title (no 「跨議題」). The same look and text as on the list pages. */
function issueFilter(index: IndexFile, state: ListState, numbers: number[]): ListBarFilter {
  return {
    kind: 'choices',
    key: 'issue',
    label: t.solutionsList.issueFilter,
    options: numbers.map((n) => ({
      value: String(n),
      label: t.solutionsList.issueOption(n, index.issues.find((i) => i.number === n)?.title ?? ''),
    })),
    value: state.issues.map(String),
    none: t.listBar.all,
    next: (v) => ({ ...state, issues: v.map(Number) }),
  }
}

/** The 議題 part of the result line: 「議題：#1、#2」, or nothing. */
const issuePart = (state: ListState) =>
  state.issues.length > 0
    ? [t.listBar.filterPart(t.solutionsList.issueFilter, state.issues.map(t.solutionsList.issueShort))]
    : []

/** The text when the filters and the search leave nothing (design 3.23.6).
 * 「清除篩選」 is in the result line above it. */
function noneText(state: ListState, none: string, noun: string): string {
  if (state.q === null) return none
  const filtersOn = state.issues.length > 0 || state.who !== null || state.specialOnly
  return filtersOn ? t.listSearch.noMatchFiltered(state.q, noun) : t.listSearch.noMatch(state.q, noun)
}

/** The sort note while a share sort is on (design 3.23.3). */
function SortNote({ id, state }: { id: string; state: ListState }) {
  if (state.sort !== 'evidence' && state.sort !== 'solutions') return null
  return <p id={id} className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.listBar.sortNotes[state.sort]}</p>
}

/** The 解法 tab: every solution, from every issue, that uses the space,
 * grouped by issue. The menu bar (decision 138) has the sort, the filters
 * and the search of #/solutions: 排序 (最近更新, 最近新增, 資料根據比例),
 * 議題, 利害關係人 and the search. Inside each issue group the solutions
 * follow the sort. */
function SolutionsTab({ index, code, issues }: { index: IndexFile; code: string; issues: IssueFile[] }) {
  const items = useMemo(() => spaceSolutionItems(issues, code), [issues, code])
  const numbers = useMemo(() => spaceSolutionIssues(issues, code), [issues, code])
  // The picker lists only the stakeholders of the solutions of this space.
  const ids = useMemo(() => [...new Set(stakeholdersBySpace(issues, code).flatMap((e) => e.stakeholders))], [issues, code])
  const { state, go } = useSpaceTabState('solutions', index, numbers)
  const noteId = useId()
  const shown = useMemo(() => spaceSolutionsView(items, state, issues), [items, state, issues])
  if (items.length === 0) return <p>{tp.solutionsNone}</p>

  const filters: ListBarFilter[] = [
    issueFilter(index, state, numbers),
    {
      kind: 'slot',
      key: 'who',
      active: state.who !== null,
      render: (place) => (
        <StakeholderPicker
          stakeholders={index.stakeholders}
          pathLabels={index.pathLabels}
          value={state.who}
          ids={ids}
          place={place}
          className="max-w-full"
        />
      ),
    },
  ]
  const who = state.who === null ? null : findStakeholder(index.stakeholders, state.who)
  const parts = [
    ...issuePart(state),
    ...(who === null ? [] : [t.listBar.filterPart(t.solutionsList.whoFilter, [t.sideMenu.item(who.id, who.name)])]),
  ]
  const shareOn = state.sort === 'evidence'

  return (
    <>
      <SpaceTabMenu tab="solutions" state={state} filters={filters} sortNoteId={shareOn ? noteId : undefined} go={go} />
      <ResultLine page="solutions" shown={shown.length} total={items.length} q={state.q} parts={parts} className="mt-3" />
      <SortNote id={noteId} state={state} />
      <div className="mt-4">
        {shown.length === 0 && <p>{noneText(state, t.solutionsList.none, t.solutionsList.noun)}</p>}
        {groupByIssue(shown).map((group) => {
          const issue = issues.find((i) => i.number === group.issueNumber)!
          return (
            <LabelledSection key={issue.number} headingId={`space-solutions-${issue.number}`} className="mt-6 first:mt-0">
              <h3 id={`space-solutions-${issue.number}`} className="font-semibold">{issueTitle(issues, issue.number)}</h3>
              <ul className={cn('mt-2', cardGridClass)}>
                {group.items.map(({ solution: sol }) => {
                  const others = otherSpaces(sol, code)
                  return (
                    <li key={sol.id}>
                      <SolutionCard variant="compact" solution={sol} issueNumber={issue.number}>
                        <dl className="mt-2 text-sm">
                          <CoveredBasisField basis={{ cells: solutionCells(issue, sol), percent: null }} />
                        </dl>
                        {others.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-x-2 text-sm">
                            <span className="text-muted-foreground">{tp.otherSpaces}</span>
                            <SpaceLinks spaceTypes={index.spaceTypes} codes={others} />
                          </div>
                        )}
                      </SolutionCard>
                    </li>
                  )
                })}
              </ul>
            </LabelledSection>
          )
        })}
      </div>
    </>
  )
}

/** The 利害關係人 tab: the stakeholders of the stories that the solutions
 * of this space cover. First the ones in several issues, then by issue.
 * The menu bar (decision 138) has the sort, the filters and the search of
 * #/stakeholders: 排序 (最近更新, 最近新增, 資料根據比例, 解法涵蓋比例), 議題,
 * 只看特別關注族群 and the search. No tree view. Inside each block the
 * stakeholders follow the sort. The block 「在多個議題都出現的利害關係人」 has
 * no border box (decision 138). */
function StakeholdersTab({ index, code, issues }: { index: IndexFile; code: string; issues: IssueFile[] }) {
  const numbers = useMemo(() => spaceStakeholderIssues(issues, code), [issues, code])
  const { state, go } = useSpaceTabState('stakeholders', index, numbers)
  const noteId = useId()
  const view = useMemo(() => spaceStakeholdersView(index, issues, code, state), [index, issues, code, state])
  const available = availableIssues(index).map((i) => i.number)
  if (view.total === 0) return <p>{tp.stakeholdersNone}</p>

  const filters: ListBarFilter[] = [
    issueFilter(index, state, numbers),
    {
      kind: 'toggle',
      key: 'specialonly',
      label: t.stakeholdersList.specialOnly,
      pressed: state.specialOnly,
      next: (pressed) => ({ ...state, specialOnly: pressed }),
    },
  ]
  const parts = [...issuePart(state), ...(state.specialOnly ? [t.stakeholdersList.specialOnly] : [])]
  const shareOn = state.sort === 'evidence' || state.sort === 'solutions'

  return (
    <>
      <p className="text-muted-foreground">{tp.stakeholdersIntro}</p>
      <SpaceTabMenu tab="stakeholders" state={state} filters={filters} sortNoteId={shareOn ? noteId : undefined} go={go} className="mt-4" />
      <ResultLine page="stakeholders" shown={view.shown} total={view.total} q={state.q} parts={parts} className="mt-3" />
      <SortNote id={noteId} state={state} />

      {view.shown === 0 ? (
        <p className="mt-4">{noneText(state, t.stakeholdersList.none, t.stakeholdersList.noun)}</p>
      ) : (
        <>
          {/* No border box (decision 138): the heading and the text only. */}
          <LabelledSection headingId="space-shared" className="mt-6">
            <h3 id="space-shared" className="font-semibold">{tp.sharedHeading}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{tp.sharedIntro}</p>
            {view.shared.length === 0 ? (
              <p className="mt-2">{view.sharedAny && spaceTabFiltered(state) ? t.stakeholdersList.none : tp.sharedNone}</p>
            ) : (
              <ul className={cn('mt-2', cardGridClass)}>
                {view.shared.map((s) => (
                  <li key={s.id}>
                    <StakeholderCard variant="compact" stakeholder={findStakeholder(index.stakeholders, s.id)}>
                      {/* The issues with their titles, one per line, and the
                          資料根據 of the stakeholder in those issues (decision 112). */}
                      <dl className="mt-1 space-y-1 text-sm">
                        <Field label={tp.sharedIssues}>
                          <IssueTitleLinks numbers={s.issues} titles={index.issues} to={(n) => `/issues/${n}`} />
                        </Field>
                        <BasisField cells={stakeholderCells(issues.filter((i) => s.issues.includes(i.number)), s.id)} />
                      </dl>
                    </StakeholderCard>
                  </li>
                ))}
              </ul>
            )}
          </LabelledSection>

          <h3 className="mt-6 font-semibold">{tp.byIssueHeading}</h3>
          {view.byIssue.map((entry) => (
            <LabelledSection key={entry.issueNumber} headingId={`space-people-${entry.issueNumber}`} className="mt-3">
              <h4 id={`space-people-${entry.issueNumber}`} className="font-medium">{issueTitle(issues, entry.issueNumber)}</h4>
              <ul className={cn('mt-2', cardGridClass)}>
                {entry.stakeholders.map((id) => (
                  <li key={id}>
                    <StakeholderCard variant="compact" stakeholder={findStakeholder(index.stakeholders, id)}>
                      <AlsoInLine index={index} id={id} issueNumber={entry.issueNumber} available={available} />
                      {/* 資料根據 of the stakeholder in this issue (decision 112). */}
                      <dl className="mt-1 text-sm">
                        <BasisField cells={stakeholderCells(issues.filter((i) => i.number === entry.issueNumber), id)} />
                      </dl>
                    </StakeholderCard>
                  </li>
                ))}
              </ul>
            </LabelledSection>
          ))}
        </>
      )}
    </>
  )
}
