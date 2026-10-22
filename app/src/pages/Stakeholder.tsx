import { useMemo, type ComponentType } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router'
import { DataBasisToggle } from '@/components/DataBasisToggle'
import { Field } from '@/components/Field'
import { FilterStatus } from '@/components/FilterStatus'
import { LoadState } from '@/components/LoadState'
import { PageBand, PageBody, type BackTarget } from '@/components/PageBand'
import { PageTabs } from '@/components/PageTabs'
import { PageTitle } from '@/components/PageTitle'
import type { StakeholderTabProps } from '@/components/stakeholder/IssueSection'
import { NeedsTab } from '@/components/stakeholder/NeedsTab'
import { OverviewTab } from '@/components/stakeholder/OverviewTab'
import { SolutionsTab } from '@/components/stakeholder/SolutionsTab'
import { WantsTab } from '@/components/stakeholder/WantsTab'
import { linkClass } from '@/components/styles'
import { Badge } from '@/components/ui/badge'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { parseStakeholderTab, STAKEHOLDER_TABS, stakeholderTabPath, type StakeholderTab } from '@/lib/entityPaths'
import { backListPath } from '@/lib/backLink'
import { tabPath } from '@/lib/issuePage'
import { isDataBasisFilterOn } from '@/lib/dataBasis'
import { availableIssues } from '@/lib/issues'
import {
  movedFrom, movedStakeholderRedirect, pathTrail, stakeholderIssueNumbers,
} from '@/lib/stakeholderPage'
import { hasNoIssue, resolveId } from '@/lib/stakeholders'
import { stakeholderTabCounts, type TabCounts } from '@/lib/tabCounts'
import type { TabLabel } from '@/lib/tabLabel'
import type { AvailableIssueSummary, IndexFile, Stakeholder as StakeholderType } from '@/types'

const tp = t.stakeholderPage

/** The tab label with its count. While the issues load, the name only. */
function tabLabel(tab: StakeholderTab, c: TabCounts | null): TabLabel {
  if (c === null || tab === 'overview') return { main: tp.tabs[tab] }
  if (tab === 'wants') return tp.tabLabels.wants(c.wants, c.conflicts)
  return tp.tabLabels[tab](c[tab])
}

/** Stakeholder page (design 3.3 and 3.23.10): #/stakeholders/:id/:tab?, with
 * no side bar (decision 94). A moved ID sends the reader to the new ID, with
 * the rest of the path kept and ?from=<old ID> for the note 「O02 已改為
 * I12」. */
export default function Stakeholder() {
  const index = useIndex()
  const { id = '' } = useParams()
  const location = useLocation()
  if (index.status !== 'ready') return <PageBody><LoadState state={index} /></PageBody>

  const resolved = resolveId(index.data.stakeholders, id)
  if (resolved === null) {
    return (
      <PageBody>
        <PageTitle parts={[tp.notFoundTitle]} />
        <h1 className="text-2xl font-bold">{tp.notFoundTitle}</h1>
        <p className="mt-3">{tp.notFoundBody(id)}</p>
        <p className="mt-3">
          <Link to="/" className={linkClass}>{tp.backHome}</Link>
        </p>
      </PageBody>
    )
  }
  if (resolved !== id) {
    return <Navigate replace to={movedStakeholderRedirect(location.pathname, location.search, id, resolved)} />
  }
  // resolveId returned id itself, so the stakeholder is in the list.
  const stakeholder = index.data.stakeholders.find((s) => s.id === id)!
  if (hasNoIssue(stakeholder)) return <NoIssueContent index={index.data} stakeholder={stakeholder} />
  return <StakeholderContent key={id} index={index.data} stakeholder={stakeholder} />
}

const TAB_CONTENT: Record<StakeholderTab, ComponentType<StakeholderTabProps>> = {
  overview: OverviewTab,
  wants: WantsTab,
  needs: NeedsTab,
  solutions: SolutionsTab,
}

/** The back button of the band (decision 111): the stakeholder list, with
 * the sort, filters, view and search the reader last used there in this
 * session. */
const backToStakeholders = (): BackTarget => ({ to: backListPath('stakeholders'), label: t.backLink.stakeholders })

/** The ID and the 分類路徑 of a stakeholder, at the top of 總覽 (decision
 * 111), or under the band on the page of a stakeholder with no issue. */
function IdAndPath({ index, stakeholder: s }: { index: IndexFile; stakeholder: StakeholderType }) {
  const trail = pathTrail(s.path, index.pathLabels)
  return (
    <>
      <Field label={tp.id}><span className="font-mono">{s.id}</span></Field>
      {trail.length > 0 && (
        <Field label={tp.path}>
          <ol className="flex flex-wrap items-center gap-x-1">
            {trail.map((step, i) => (
              <li key={step.path} className="flex items-center gap-x-1">
                {i > 0 && <span aria-hidden="true" className="text-muted-foreground">›</span>}
                {step.label}
              </li>
            ))}
          </ol>
        </Field>
      )}
    </>
  )
}

/** The filter row at the top of the tab content (design 3.23.10): the
 * 「只看有資料根據」 toggle, then the filter status line with 「清除篩選」. */
function FilterRow() {
  const [params] = useSearchParams()
  return (
    <div className="mb-4 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-start md:gap-x-4">
      <DataBasisToggle />
      <FilterStatus
        filters={{ dataBasedOnly: isDataBasisFilterOn(params), special: [] }}
        stakeholder={null}
        className="mb-0 md:mt-2"
      />
    </div>
  )
}

/** The page of a stakeholder with no issue and no move target (decision 78):
 * the band with the name, then the ID, the path and a short note. No tabs,
 * because there is nothing to show in them. This stakeholder is not in any
 * list or menu. */
function NoIssueContent({ index, stakeholder: s }: { index: IndexFile; stakeholder: StakeholderType }) {
  return (
    <>
      <PageTitle parts={[s.name]} />
      <PageBand back={backToStakeholders()}>{s.name}</PageBand>
      <PageBody>
        <dl className="space-y-1.5 text-sm">
          <IdAndPath index={index} stakeholder={s} />
        </dl>
        <p className="mt-6">{tp.noIssueNote}</p>
      </PageBody>
    </>
  )
}

function StakeholderContent({ index, stakeholder: s }: { index: IndexFile; stakeholder: StakeholderType }) {
  const [params] = useSearchParams()
  const from = movedFrom(index.stakeholders, params.get('from'), s.id)
  const shown = useMemo(() => {
    const summaries = availableIssues(index)
    const numbers = stakeholderIssueNumbers(s, summaries.map((i) => i.number))
    return summaries.filter((i) => numbers.includes(i.number))
  }, [index, s])
  const folders = useMemo(() => shown.map((i) => i.folder), [shown])
  const issues = useIssues(folders)
  const tab = parseStakeholderTab(useParams().tab)
  const counts = useMemo(
    () => (issues.status === 'ready' ? stakeholderTabCounts(issues.data, s.id) : null),
    [issues, s.id],
  )

  const body = (name: StakeholderTab) => {
    if (shown.length === 0) return <p>{tp.noIssues}</p>
    if (issues.status !== 'ready') return <LoadState state={issues} />
    const Content = TAB_CONTENT[name]
    return (
      <>
        <FilterRow />
        <Content index={index} issues={issues.data} id={s.id} />
      </>
    )
  }
  // The metadata is at the top of 總覽 (decision 111). It needs only
  // index.json, so it shows while the issues load.
  const content = (name: StakeholderTab) => (
    <>
      {name === 'overview' && <StakeholderMeta index={index} stakeholder={s} shown={shown} />}
      {body(name)}
    </>
  )

  return (
    <>
      <PageTitle parts={[s.name, tab && tab !== 'overview' ? tp.tabs[tab] : null]} />
      <PageBand back={backToStakeholders()}>{s.name}</PageBand>
      <PageBody>
        {from && (
          <p role="status" className="mb-4 rounded-md border px-4 py-2 text-sm">
            {tp.movedNote(from, s.id)}
          </p>
        )}
        {/* No stakeholder side bar (decision 94). */}
        <PageTabs
          label={tp.tabsLabel}
          tabs={STAKEHOLDER_TABS}
          current={tab}
          nameOf={(name) => tp.tabs[name]}
          labelOf={(name) => tabLabel(name, counts)}
          pathOf={(name) => stakeholderTabPath(s.id, name)}
          notFound={tp.tabNotFound}
          overviewPath={stakeholderTabPath(s.id, 'overview')}
          overviewLink={tp.goToOverview}
        >
          {content}
        </PageTabs>
      </PageBody>
    </>
  )
}

/** The metadata at the top of 總覽 (decision 111): the ID, 分類路徑,
 * 特別關注 and the issues the stakeholder is in (links). */
function StakeholderMeta({ index, stakeholder: s, shown }: {
  index: IndexFile
  stakeholder: StakeholderType
  shown: AvailableIssueSummary[]
}) {
  return (
    <dl className="mb-6 space-y-1.5 text-sm">
      <IdAndPath index={index} stakeholder={s} />
      {s.focus.length > 0 && (
        <Field label={tp.focus}>
          <ul className="flex flex-wrap gap-1">
            {s.focus.map((f) => (
              <li key={f}><Badge variant="secondary" className="rounded-sm">{f}</Badge></li>
            ))}
          </ul>
        </Field>
      )}
      <Field label={tp.issues}>
        {shown.length === 0 ? (
          tp.noIssues
        ) : (
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {shown.map((i) => (
              <li key={i.number}>
                <Link to={tabPath(i.number, 'overview')} className={linkClass}>
                  {t.issueCard.numberTitle(i.number, i.title)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Field>
    </dl>
  )
}
