import { useMemo, type ComponentType } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router'
import { DataBasisToggle } from '@/components/DataBasisToggle'
import { Field } from '@/components/Field'
import { LoadState } from '@/components/LoadState'
import { PageTabs } from '@/components/PageTabs'
import { PageTitle } from '@/components/PageTitle'
import { StakeholderMenu, StakeholderMenuLayout } from '@/components/StakeholderMenu'
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
import { tabPath } from '@/lib/issuePage'
import { availableIssues } from '@/lib/issues'
import {
  movedFrom, movedStakeholderRedirect, pathTrail, stakeholderIssueNumbers, stakeholderMenuIds,
} from '@/lib/stakeholderPage'
import { resolveId } from '@/lib/stakeholders'
import { stakeholderTabCounts, type TabCounts } from '@/lib/tabCounts'
import type { IndexFile, Stakeholder as StakeholderType } from '@/types'

const tp = t.stakeholderPage

/** The tab label with its count. While the issues load, the name only. */
function tabLabel(tab: StakeholderTab, c: TabCounts | null): string {
  if (c === null || tab === 'overview') return tp.tabs[tab]
  if (tab === 'wants') return tp.tabLabels.wants(c.wants, c.conflicts)
  return tp.tabLabels[tab](c[tab])
}

/** Stakeholder page (design 3.3): #/stakeholders/:id/:tab?. A moved ID sends
 * the reader to the new ID, with the rest of the path kept and
 * ?from=<old ID> for the note 「O02 已改為 I12」. */
export default function Stakeholder() {
  const index = useIndex()
  const { id = '' } = useParams()
  const location = useLocation()
  if (index.status !== 'ready') return <LoadState state={index} />

  const resolved = resolveId(index.data.stakeholders, id)
  if (resolved === null) {
    return (
      <>
        <PageTitle parts={[tp.notFoundTitle]} />
        <h1 className="text-2xl font-bold">{tp.notFoundTitle}</h1>
        <p className="mt-3">{tp.notFoundBody(id)}</p>
        <p className="mt-3">
          <Link to="/" className={linkClass}>{tp.backHome}</Link>
        </p>
      </>
    )
  }
  if (resolved !== id) {
    return <Navigate replace to={movedStakeholderRedirect(location.pathname, location.search, id, resolved)} />
  }
  // resolveId returned id itself, so the stakeholder is in the list.
  const stakeholder = index.data.stakeholders.find((s) => s.id === id)!
  return <StakeholderContent key={id} index={index.data} stakeholder={stakeholder} />
}

const TAB_CONTENT: Record<StakeholderTab, ComponentType<StakeholderTabProps>> = {
  overview: OverviewTab,
  wants: WantsTab,
  needs: NeedsTab,
  solutions: SolutionsTab,
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
  const menuIds = useMemo(() => stakeholderMenuIds(index), [index])
  const trail = pathTrail(s.path, index.pathLabels)
  const tab = parseStakeholderTab(useParams().tab)
  const counts = useMemo(
    () => (issues.status === 'ready' ? stakeholderTabCounts(issues.data, s.id) : null),
    [issues, s.id],
  )

  const content = (name: StakeholderTab) => {
    if (shown.length === 0) return <p>{tp.noIssues}</p>
    if (issues.status !== 'ready') return <LoadState state={issues} />
    const Content = TAB_CONTENT[name]
    return (
      <>
        <DataBasisToggle className="mb-6" />
        <Content index={index} issues={issues.data} id={s.id} />
      </>
    )
  }

  return (
    <>
      {from && (
        <p role="status" className="mb-4 rounded-md border px-4 py-2 text-sm">
          {tp.movedNote(from, s.id)}
        </p>
      )}
      <PageTitle parts={[s.name, tab && tab !== 'overview' ? tp.tabs[tab] : null]} />
      <h1 className="text-2xl font-bold md:text-3xl">{s.name}</h1>
      <dl className="mt-3 space-y-1.5 text-sm">
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

      {/* The menu goes to the same tab of another stakeholder (design 3.14).
          For an unknown tab it goes to the overview. */}
      <StakeholderMenuLayout
        className="mt-6"
        menu={
          <StakeholderMenu mode="switch" ids={menuIds} stakeholders={index.stakeholders} current={s.id} tab={tab ?? 'overview'} />
        }
      >
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
      </StakeholderMenuLayout>
    </>
  )
}
