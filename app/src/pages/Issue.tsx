import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ConflictsTab } from '@/components/issue/ConflictsTab'
import { NeedsTab } from '@/components/issue/NeedsTab'
import { OverviewTab } from '@/components/issue/OverviewTab'
import { SolutionsTab } from '@/components/issue/SolutionsTab'
import { StakeholdersTab } from '@/components/issue/StakeholdersTab'
import { SummaryTab } from '@/components/issue/SummaryTab'
import { WantsTab } from '@/components/issue/WantsTab'
import type { IssueTabProps } from '@/components/issue/types'
import { DateFields } from '@/components/DateFields'
import { Field } from '@/components/Field'
import { LoadState } from '@/components/LoadState'
import { SpaceLinks } from '@/components/SpaceLinks'
import { PageBand, PageBody, type BackTarget } from '@/components/PageBand'
import { PageTabs } from '@/components/PageTabs'
import { linkClass } from '@/components/styles'
import { useIndex, useIssue } from '@/data'
import { t } from '@/i18n/zh-TW'
import { PageTitle } from '@/components/PageTitle'
import { backListPath } from '@/lib/backLink'
import { availableIssues } from '@/lib/issues'
import {
  findIssue, ISSUE_TABS, isSummaryTab, parseTab, tabPath, type IssueTab, type SummaryTab as SummaryTabName,
} from '@/lib/issuePage'
import { summaryTabCounts, type SummaryTopicKey } from '@/lib/summary'
import { issueStakeholderTabCounts, issueTabCounts, type TabCounts } from '@/lib/tabCounts'
import type { TabLabel } from '@/lib/tabLabel'
import type { AvailableIssueSummary, IndexFile } from '@/types'

const ti = t.issue

/** The content of a 分析摘要 topic tab (decision 102). */
const summaryTab = (tab: SummaryTabName) => (props: IssueTabProps) => <SummaryTab {...props} tab={tab} />

const TAB_CONTENT: Record<IssueTab, (props: IssueTabProps) => ReactNode> = {
  overview: OverviewTab,
  wants: WantsTab,
  needs: NeedsTab,
  conflicts: ConflictsTab,
  solutions: SolutionsTab,
  decisions: summaryTab('decisions'),
  stakeholders: StakeholdersTab,
}

/** All the counts of the tab labels. */
type IssueCounts = TabCounts & { summary: Record<SummaryTopicKey, number>; stakeholders: { stakeholders: number; disadvantaged: number } }

/** The tab label with its count. While the issue loads, the name only. */
function tabLabel(tab: IssueTab, c: IssueCounts | null): TabLabel {
  if (c === null || tab === 'overview') return { main: ti.tabs[tab] }
  if (isSummaryTab(tab)) return ti.tabLabels.summary(ti.tabs[tab], c.summary[tab])
  if (tab === 'stakeholders') return ti.tabLabels.stakeholders(c.stakeholders.stakeholders, c.stakeholders.disadvantaged)
  return ti.tabLabels[tab](c[tab])
}

function BackHome() {
  return (
    <p className="mt-3">
      <Link to="/" className={linkClass}>{ti.backHome}</Link>
    </p>
  )
}

/** The back button of the band (decision 111): the issue list, with the
 * sort, filters and search the reader last used there in this session. */
const backToIssues = (): BackTarget => ({ to: backListPath('issues'), label: t.backLink.issues })

/** Issue page (design 3.2): #/issues/:number/:tab? with seven tabs: 總覽,
 * 利害關係人 (decisions 109, 115 and 116), 訴求, 需求, 衝突 (decision 142),
 * 難以取捨 (a 分析摘要 topic, decision 102) and 解法 (decision 140). Every tab but 總覽 has a menu
 * bar with its filters (IssueMenuBar, decision 116). */
export default function Issue() {
  const index = useIndex()
  const { number } = useParams()
  if (index.status !== 'ready') return <PageBody><LoadState state={index} /></PageBody>

  const found = findIssue(index.data, number)
  if (found.kind === 'notFound') {
    return (
      <PageBody>
        <PageTitle parts={[ti.notFoundTitle]} />
        <h1 className="text-2xl font-bold">{ti.notFoundTitle}</h1>
        <p className="mt-3">{ti.notFoundBody}</p>
        <BackHome />
      </PageBody>
    )
  }
  if (found.kind === 'unavailable') {
    const title = t.issueCard.numberTitle(found.issue.number, found.issue.title)
    return (
      <>
        <PageTitle parts={[title]} />
        <PageBand back={backToIssues()}>{title}</PageBand>
        <PageBody>
          <p>{ti.unavailableBody}</p>
          <BackHome />
        </PageBody>
      </>
    )
  }
  return <IssueContent index={index.data} summary={found.issue} />
}

function IssueContent({ index, summary }: { index: IndexFile; summary: AvailableIssueSummary }) {
  const issue = useIssue(summary.folder)
  const available = useMemo(() => availableIssues(index).map((i) => i.number), [index])
  const tab = parseTab(useParams().tab)
  const counts = useMemo<IssueCounts | null>(
    () => (issue.status === 'ready'
      ? {
        ...issueTabCounts(issue.data),
        summary: summaryTabCounts(issue.data),
        stakeholders: issueStakeholderTabCounts(index.stakeholders, issue.data),
      }
      : null),
    [index, issue],
  )

  return (
    <>
      {/* The overview is the issue page itself, so its title has no tab name. */}
      <PageTitle
        parts={[t.issueCard.numberTitle(summary.number, summary.title), tab && tab !== 'overview' ? ti.tabs[tab] : null]}
      />
      <PageBand back={backToIssues()}>{t.issueCard.numberTitle(summary.number, summary.title)}</PageBand>

      <PageBody>
        <PageTabs
          label={ti.tabsLabel}
          tabs={ISSUE_TABS}
          current={tab}
          nameOf={(name) => (isSummaryTab(name) ? ti.summaryHeadings[name] : ti.tabs[name])}
          labelOf={(name) => tabLabel(name, counts)}
          pathOf={(name) => tabPath(summary.number, name)}
          notFound={ti.tabNotFound}
          overviewPath={tabPath(summary.number, 'overview')}
          overviewLink={ti.goToOverview}
          scrollOnPhone
        >
          {(name) => {
            const Content = TAB_CONTENT[name]
            return (
              <>
                {/* The metadata is at the top of 總覽 (decision 111). It needs
                    only index.json, so it shows while the issue loads. */}
                {name === 'overview' && <IssueMeta index={index} summary={summary} />}
                {issue.status === 'ready' ? (
                  <Content index={index} summary={summary} issue={issue.data} available={available} />
                ) : (
                  <LoadState state={issue} />
                )}
              </>
            )
          }}
        </PageTabs>
      </PageBody>
    </>
  )
}

/** The metadata of the issue at the top of the 總覽 tab (decision 111): the
 * space types, 新增日期 and 更新日期 (decision 131). Nothing when all are
 * empty. */
function IssueMeta({ index, summary }: { index: IndexFile; summary: AvailableIssueSummary }) {
  if (summary.spaces.length === 0 && !summary.added && !summary.updated) return null
  return (
    <dl className="mb-6 space-y-1.5 text-sm">
      {summary.spaces.length > 0 && (
        <Field label={ti.spaces}><SpaceLinks spaceTypes={index.spaceTypes} codes={summary.spaces} /></Field>
      )}
      <DateFields added={summary.added} updated={summary.updated} />
    </dl>
  )
}
