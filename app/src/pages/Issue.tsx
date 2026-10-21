import { useMemo, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import { NeedsTab } from '@/components/issue/NeedsTab'
import { OverviewTab } from '@/components/issue/OverviewTab'
import { SolutionsTab } from '@/components/issue/SolutionsTab'
import { WantsTab } from '@/components/issue/WantsTab'
import type { IssueTabProps } from '@/components/issue/types'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Field } from '@/components/Field'
import { LoadState } from '@/components/LoadState'
import { SpaceLinks } from '@/components/SpaceLinks'
import { PageTabs } from '@/components/PageTabs'
import { linkClass } from '@/components/styles'
import { useIndex, useIssue } from '@/data'
import { t } from '@/i18n/zh-TW'
import { PageTitle } from '@/components/PageTitle'
import { availableIssues } from '@/lib/issues'
import { findIssue, ISSUE_TABS, legacyIssueTabTarget, parseIssueNumber, parseTab, tabPath, type IssueTab } from '@/lib/issuePage'
import { issueTabCounts, type TabCounts } from '@/lib/tabCounts'
import type { TabLabel } from '@/lib/tabLabel'
import type { AvailableIssueSummary, IndexFile } from '@/types'

const ti = t.issue

const TAB_CONTENT: Record<IssueTab, (props: IssueTabProps) => ReactNode> = {
  overview: OverviewTab,
  wants: WantsTab,
  needs: NeedsTab,
  solutions: SolutionsTab,
}

/** The tab label with its count. While the issue loads, the name only. */
function tabLabel(tab: IssueTab, c: TabCounts | null): TabLabel {
  if (c === null || tab === 'overview') return { main: ti.tabs[tab] }
  if (tab === 'wants') return ti.tabLabels.wants(c.wants, c.conflicts)
  return ti.tabLabels[tab](c[tab])
}

function BackHome() {
  return (
    <p className="mt-3">
      <Link to="/" className={linkClass}>{ti.backHome}</Link>
    </p>
  )
}

/** The breadcrumb above the h1 on every tab (design 3.2, decision 99):
 * 首頁 › 議題 › #8 無菸城市. 議題 links to the list with no params. */
function IssueBreadcrumb({ number, title }: { number: number; title: string }) {
  return (
    <Breadcrumb
      items={[
        { name: t.breadcrumb.home, to: '/' },
        { name: t.breadcrumb.issues, to: '/issues' },
        { id: t.issueId(number), name: title },
      ]}
    />
  )
}

/** Issue page (design 3.2): #/issues/:number/:tab? with four tabs. The old
 * tabs opinion, conflicts and stakeholders redirect (legacyIssueTab). */
export default function Issue() {
  const index = useIndex()
  const { number, tab } = useParams()
  const { search } = useLocation()
  // The old tab URLs need no data, so they redirect before the index loads.
  const legacy = parseIssueNumber(number)
  const target = legacy === null ? null : legacyIssueTabTarget(legacy, tab, search)
  if (target) return <Navigate replace to={target} />
  if (index.status !== 'ready') return <LoadState state={index} />

  const found = findIssue(index.data, number)
  if (found.kind === 'notFound') {
    return (
      <>
        <PageTitle parts={[ti.notFoundTitle]} />
        <h1 className="text-2xl font-bold">{ti.notFoundTitle}</h1>
        <p className="mt-3">{ti.notFoundBody}</p>
        <BackHome />
      </>
    )
  }
  if (found.kind === 'unavailable') {
    return (
      <>
        <PageTitle parts={[t.issueCard.numberTitle(found.issue.number, found.issue.title)]} />
        <IssueBreadcrumb number={found.issue.number} title={found.issue.title} />
        <h1 className="mt-4 text-2xl font-bold">{t.issueCard.numberTitle(found.issue.number, found.issue.title)}</h1>
        <p className="mt-3">{ti.unavailableBody}</p>
        <BackHome />
      </>
    )
  }
  return <IssueContent index={index.data} summary={found.issue} />
}

function IssueContent({ index, summary }: { index: IndexFile; summary: AvailableIssueSummary }) {
  const issue = useIssue(summary.folder)
  const available = useMemo(() => availableIssues(index).map((i) => i.number), [index])
  const tab = parseTab(useParams().tab)
  const counts = useMemo(() => (issue.status === 'ready' ? issueTabCounts(issue.data) : null), [issue])

  return (
    <>
      {/* The overview is the issue page itself, so its title has no tab name. */}
      <PageTitle
        parts={[t.issueCard.numberTitle(summary.number, summary.title), tab && tab !== 'overview' ? ti.tabs[tab] : null]}
      />
      <IssueBreadcrumb number={summary.number} title={summary.title} />
      <h1 className="mt-4 text-2xl font-bold md:text-3xl">{t.issueCard.numberTitle(summary.number, summary.title)}</h1>
      <dl className="mt-3 space-y-1.5 text-sm">
        {summary.spaces.length > 0 && (
          <Field label={ti.spaces}><SpaceLinks spaceTypes={index.spaceTypes} codes={summary.spaces} /></Field>
        )}
        {summary.updated && (
          <Field label={ti.updated}><time dateTime={summary.updated}>{summary.updated}</time></Field>
        )}
      </dl>

      <PageTabs
        label={ti.tabsLabel}
        tabs={ISSUE_TABS}
        current={tab}
        nameOf={(name) => ti.tabs[name]}
        labelOf={(name) => tabLabel(name, counts)}
        pathOf={(name) => tabPath(summary.number, name)}
        notFound={ti.tabNotFound}
        overviewPath={tabPath(summary.number, 'overview')}
        overviewLink={ti.goToOverview}
      >
        {(name) => {
          const Content = TAB_CONTENT[name]
          return issue.status === 'ready' ? (
            <Content index={index} summary={summary} issue={issue.data} available={available} />
          ) : (
            <LoadState state={issue} />
          )
        }}
      </PageTabs>
    </>
  )
}
