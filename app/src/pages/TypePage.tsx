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
import { TypeLinks } from '@/components/TypeLinks'
import { TypeTabMenu, useTypeTabState } from '@/components/TypeTabMenu'
import { TYPE_ID_PREFIX, TYPE_PAGE_TEXT } from '@/components/typeText'
import { ResultLine } from '@/components/ResultLine'
import { StakeholderPicker } from '@/components/StakeholderPicker'
import { StakeholderCard } from '@/components/StakeholderCard'
import { cardGridClass, linkClass } from '@/components/styles'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { PageTitle } from '@/components/PageTitle'
import { backListPath } from '@/lib/backLink'
import { solutionCells, stakeholderCells } from '@/lib/coverage'
import { parseTypeTab, TYPE_TABS, typeTabPath, type TypeTab } from '@/lib/entityPaths'
import { availableIssues } from '@/lib/issues'
import type { ListState } from '@/lib/listParams'
import {
  findType, issueListsSolutionCodes, issuesByType, otherTypes, solutionsByType, stakeholdersByType, TYPE_LIST_PAGES,
  typeIssues, typesOf, typeStakeholderCount, type TypeKind, type TypeOfKind,
} from '@/lib/typeKinds'
import {
  groupByIssue, typeSolutionIssues, typeSolutionItems, typeSolutionsView, typeStakeholderIssues, typeStakeholdersView,
  typeTabFiltered,
} from '@/lib/typeTabs'
import { findStakeholder } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { TabLabel } from '@/lib/tabLabel'
import type { AvailableIssueSummary, DomainType, IndexFile, IssueFile, SolutionType, SpaceType } from '@/types'

/** A type page: the space page (design 3.6), the 領域 page and the
 * 解法類型 page (Task U3). #/<list>/:code/:tab? with four tabs (decision
 * 129): 總覽, 議題, 解法 and 利害關係人. The page lists what uses the same
 * type: for a space, what competes for the same city space. The band has
 * the back button to the list page (#/spaces, #/domains, #/solution-types;
 * decision 120; before: the issue list, decision 111).
 *
 * Only a level 2 code has a page. A level 1 code (for example
 * economic-development) or an unknown code shows the not-found text. No
 * redirect. */
export default function TypePage({ kind }: { kind: TypeKind }) {
  const index = useIndex()
  const { code = '' } = useParams()
  if (index.status !== 'ready') return <PageBody><LoadState state={index} /></PageBody>

  const tp = TYPE_PAGE_TEXT[kind]
  const type = findType(kind, index.data, code)
  if (!type) {
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
  return <TypeContent key={`${kind}:${code}`} kind={kind} index={index.data} type={type} />
}

/** The counts of the 解法 and 利害關係人 tabs. */
type TypeCounts = { solutions: number; stakeholders: number }

/** The tab label with its count. 議題 needs only index.json for a space;
 * for a 領域 or a 解法類型 it needs the issue files too. 解法 and
 * 利害關係人 need the issue files. While they load, the name only. */
function tabLabel(kind: TypeKind, tab: TypeTab, issueCount: number | null, c: TypeCounts | null): TabLabel {
  const tp = TYPE_PAGE_TEXT[kind]
  if (tab === 'overview') return { main: tp.tabs.overview }
  if (tab === 'issues') return issueCount === null ? { main: tp.tabs.issues } : tp.tabLabels.issues(issueCount)
  if (c === null) return { main: tp.tabs[tab] }
  return tp.tabLabels[tab](c[tab])
}

function TypeContent({ kind, index, type }: { kind: TypeKind; index: IndexFile; type: TypeOfKind[TypeKind] }) {
  const tp = TYPE_PAGE_TEXT[kind]
  const code = type.code
  // A space needs only the files of the issues that use it, because a
  // solution space is always on its issue. A 領域 or a 解法類型 needs every
  // analyzed issue file to find the issues that use it.
  const fromIndex = issueListsSolutionCodes(kind)
  const indexSummaries = useMemo(() => (fromIndex ? issuesByType(kind, index, [], code) : null), [fromIndex, kind, index, code])
  const folders = useMemo(
    () => (indexSummaries ?? availableIssues(index)).map((i) => i.folder),
    [indexSummaries, index],
  )
  const issues = useIssues(folders)
  const files = issues.status === 'ready' ? issues.data : null
  /** The issues that use the type, or null while the files load. */
  const summaries = useMemo<AvailableIssueSummary[] | null>(
    () => indexSummaries ?? (files ? typeIssues(kind, index, files, code) : null),
    [indexSummaries, files, kind, index, code],
  )
  const tab = parseTypeTab(useParams().tab)
  // The same helpers as the card on the list page, so the numbers match.
  const counts = useMemo<TypeCounts | null>(() => {
    if (summaries !== null && summaries.length === 0) return { solutions: 0, stakeholders: 0 }
    if (files === null) return null
    return {
      solutions: solutionsByType(kind, files, code).length,
      stakeholders: typeStakeholderCount(stakeholdersByType(kind, files, code)),
    }
  }, [summaries, files, kind, code])

  /** The 議題, 解法 and 利害關係人 tabs need the issues of the type. 解法
   * and 利害關係人 also need the issue files. */
  const withIssues = (none: string, body: (files: IssueFile[]) => ReactNode) => {
    if (summaries !== null && summaries.length === 0) return <p>{none}</p>
    if (issues.status !== 'ready') return <LoadState state={issues} />
    return body(issues.data)
  }

  /** The hidden h2 of each tab: the heading of the section it replaces. */
  const tabHeadings: Record<TypeTab, string> = {
    overview: tp.tabs.overview,
    issues: tp.issuesHeading,
    solutions: tp.solutionsHeading,
    stakeholders: tp.stakeholdersHeading,
  }

  const content = (name: TypeTab) => {
    if (name === 'overview') return <TypeOverview kind={kind} type={type} />
    if (name === 'issues') {
      // summaries is null only while the files load or when they fail.
      if (summaries === null) return issues.status === 'ready' ? null : <LoadState state={issues} />
      return <IssuesTab kind={kind} index={index} summaries={summaries} />
    }
    if (name === 'solutions') {
      return withIssues(tp.solutionsNone, (f) => <SolutionsTab kind={kind} index={index} code={code} issues={f} />)
    }
    return withIssues(tp.stakeholdersNone, (f) => <StakeholdersTab kind={kind} index={index} code={code} issues={f} />)
  }

  return (
    <>
      {/* The overview is the type page itself, so its title has no tab name. */}
      <PageTitle parts={[type.name, tab && tab !== 'overview' ? tp.tabs[tab] : null]} />
      <PageBand back={{ to: backListPath(TYPE_LIST_PAGES[kind]), label: tp.back }}>{type.name}</PageBand>
      <PageBody>
        <PageTabs
          label={tp.tabsLabel}
          tabs={TYPE_TABS}
          current={tab}
          nameOf={(name) => tabHeadings[name]}
          labelOf={(name) => tabLabel(kind, name, summaries?.length ?? null, counts)}
          pathOf={(name) => typeTabPath(kind, code, name)}
          notFound={tp.tabNotFound}
          overviewPath={typeTabPath(kind, code, 'overview')}
          overviewLink={tp.goToOverview}
          scrollOnPhone
        >
          {content}
        </PageTabs>
      </PageBody>
    </>
  )
}

/** The 總覽 tab: the fields of the type and the intro line. It needs only
 * index.json.
 * - space: 分組 and 說明.
 * - 領域: 上層, 說明, 政事別 and 陳情系統主類別 (decision 6 of
 *   plan-types-ui.md). 上層 is the level 1 name. It is plain text: a
 *   level 1 code has no page.
 * - 解法類型: 說明, 判斷方式 and 政策工具.
 * Then the dates of the type itself (decision 131). An empty field is left
 * out. */
function TypeOverview({ kind, type }: { kind: TypeKind; type: TypeOfKind[TypeKind] }) {
  return (
    <>
      <dl className="space-y-1.5 text-sm">
        {kind === 'space' && <SpaceFields space={type as SpaceType} />}
        {kind === 'domain' && <DomainFields domain={type as DomainType} />}
        {kind === 'solutionType' && <SolutionTypeFields type={type as SolutionType} />}
        <DateFields added={type.added} updated={type.updated} />
      </dl>
      <p className="mt-4 leading-relaxed">{TYPE_PAGE_TEXT[kind].intro}</p>
    </>
  )
}

function SpaceFields({ space }: { space: SpaceType }) {
  const tp = t.spacePage
  return (
    <>
      <Field label={tp.group}>{space.group}</Field>
      {space.description && <Field label={tp.description}>{space.description}</Field>}
    </>
  )
}

function DomainFields({ domain }: { domain: DomainType }) {
  const tp = t.domainPage
  return (
    <>
      <Field label={tp.parent}>{domain.group}</Field>
      {domain.description && <Field label={tp.description}>{domain.description}</Field>}
      {domain.budgetName && <Field label={tp.budgetName}>{domain.budgetName}</Field>}
      {domain.petitionCategory && <Field label={tp.petitionCategory}>{domain.petitionCategory}</Field>}
    </>
  )
}

function SolutionTypeFields({ type }: { type: SolutionType }) {
  const tp = t.solutionTypePage
  return (
    <>
      {type.description && <Field label={tp.description}>{type.description}</Field>}
      {type.howToJudge && <Field label={tp.howToJudge}>{type.howToJudge}</Field>}
      {type.policyTool && <Field label={tp.policyTool}>{type.policyTool}</Field>}
    </>
  )
}

/** The 議題 tab: the issues that use the type, as compact cards in the
 * card grid of the tabs (cardGridClass, decision 138). The stakeholder page
 * used the same IssueCardGrid from decision 145 until decision 147. */
function IssuesTab({ kind, index, summaries }: { kind: TypeKind; index: IndexFile; summaries: AvailableIssueSummary[] }) {
  if (summaries.length === 0) return <p>{TYPE_PAGE_TEXT[kind].issuesNone}</p>
  return <IssueCardGrid index={index} issues={summaries} />
}

/** 「#2 找回消失的垃圾桶」: the heading of the group of one issue. */
const issueTitle = (issues: IssueFile[], n: number) =>
  t.issueCard.numberTitle(n, issues.find((i) => i.number === n)?.title ?? '')

/** The 議題 filter of a type page tab: one choice per issue of the tab,
 * with its title (no 「跨議題」). The same look and text as on the list
 * pages. */
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

/** The 解法 tab: every solution, from every issue, that has the type,
 * grouped by issue. The menu bar (decision 138) has the sort, the filters
 * and the search of #/solutions: 排序 (最近更新, 最近新增, 資料根據比例),
 * 議題, 利害關係人 and the search. No 空間類型 filter (see typeTabParams).
 * Inside each issue group the solutions follow the sort. Each card lists
 * the other types of the same kind on the solution (「也使用：」). */
function SolutionsTab({ kind, index, code, issues }: { kind: TypeKind; index: IndexFile; code: string; issues: IssueFile[] }) {
  const tp = TYPE_PAGE_TEXT[kind]
  const prefix = TYPE_ID_PREFIX[kind]
  const items = useMemo(() => typeSolutionItems(kind, issues, code), [kind, issues, code])
  const numbers = useMemo(() => typeSolutionIssues(kind, issues, code), [kind, issues, code])
  // The picker lists only the stakeholders of the solutions of this type.
  const ids = useMemo(
    () => [...new Set(stakeholdersByType(kind, issues, code).flatMap((e) => e.stakeholders))],
    [kind, issues, code],
  )
  const { state, go } = useTypeTabState('solutions', index, numbers)
  const noteId = useId()
  const shown = useMemo(() => typeSolutionsView(items, state, issues), [items, state, issues])
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
      <TypeTabMenu tab="solutions" state={state} filters={filters} sortNoteId={shareOn ? noteId : undefined} go={go} />
      <ResultLine page="solutions" shown={shown.length} total={items.length} q={state.q} parts={parts} className="mt-3" />
      <SortNote id={noteId} state={state} />
      <div className="mt-4">
        {shown.length === 0 && <p>{noneText(state, t.solutionsList.none, t.solutionsList.noun)}</p>}
        {groupByIssue(shown).map((group) => {
          const issue = issues.find((i) => i.number === group.issueNumber)!
          const headingId = `${prefix}-solutions-${issue.number}`
          return (
            <LabelledSection key={issue.number} headingId={headingId} className="mt-6 first:mt-0">
              <h3 id={headingId} className="font-semibold">{issueTitle(issues, issue.number)}</h3>
              <ul className={cn('mt-2', cardGridClass)}>
                {group.items.map(({ solution: sol }) => {
                  const others = otherTypes(kind, sol, code)
                  return (
                    <li key={sol.id}>
                      <SolutionCard variant="compact" solution={sol} issueNumber={issue.number}>
                        <dl className="mt-2 text-sm">
                          <CoveredBasisField basis={{ cells: solutionCells(issue, sol), percent: null }} />
                        </dl>
                        {others.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-x-2 text-sm">
                            <span className="text-muted-foreground">{tp.otherTypes}</span>
                            <TypeLinks kind={kind} types={typesOf(kind, index)} codes={others} />
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
 * of this type cover. First the ones in several issues, then by issue.
 * The menu bar (decision 138) has the sort, the filters and the search of
 * #/stakeholders: 排序 (最近更新, 最近新增, 資料根據比例, 解法涵蓋比例), 議題,
 * 只看特別關注族群 and the search. No tree view. Inside each block the
 * stakeholders follow the sort. The block 「在多個議題都出現的利害關係人」 has
 * no border box (decision 138). */
function StakeholdersTab({ kind, index, code, issues }: { kind: TypeKind; index: IndexFile; code: string; issues: IssueFile[] }) {
  const tp = TYPE_PAGE_TEXT[kind]
  const prefix = TYPE_ID_PREFIX[kind]
  const numbers = useMemo(() => typeStakeholderIssues(kind, issues, code), [kind, issues, code])
  const { state, go } = useTypeTabState('stakeholders', index, numbers)
  const noteId = useId()
  const view = useMemo(() => typeStakeholdersView(kind, index, issues, code, state), [kind, index, issues, code, state])
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
  const sharedId = `${prefix}-shared`

  return (
    <>
      <p className="text-muted-foreground">{tp.stakeholdersIntro}</p>
      <TypeTabMenu tab="stakeholders" state={state} filters={filters} sortNoteId={shareOn ? noteId : undefined} go={go} className="mt-4" />
      <ResultLine page="stakeholders" shown={view.shown} total={view.total} q={state.q} parts={parts} className="mt-3" />
      <SortNote id={noteId} state={state} />

      {view.shown === 0 ? (
        <p className="mt-4">{noneText(state, t.stakeholdersList.none, t.stakeholdersList.noun)}</p>
      ) : (
        <>
          {/* No border box (decision 138): the heading and the text only. */}
          <LabelledSection headingId={sharedId} className="mt-6">
            <h3 id={sharedId} className="font-semibold">{tp.sharedHeading}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{tp.sharedIntro}</p>
            {view.shared.length === 0 ? (
              <p className="mt-2">{view.sharedAny && typeTabFiltered(state) ? t.stakeholdersList.none : tp.sharedNone}</p>
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
          {view.byIssue.map((entry) => {
            const headingId = `${prefix}-people-${entry.issueNumber}`
            return (
              <LabelledSection key={entry.issueNumber} headingId={headingId} className="mt-3">
                <h4 id={headingId} className="font-medium">{issueTitle(issues, entry.issueNumber)}</h4>
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
            )
          })}
        </>
      )}
    </>
  )
}
