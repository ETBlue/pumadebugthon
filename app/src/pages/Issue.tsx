import { useMemo, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConflictsTab } from '@/components/issue/ConflictsTab'
import { OpinionTab } from '@/components/issue/OpinionTab'
import { OverviewTab } from '@/components/issue/OverviewTab'
import { SolutionsTab } from '@/components/issue/SolutionsTab'
import { StakeholdersTab } from '@/components/issue/StakeholdersTab'
import type { IssueTabProps } from '@/components/issue/types'
import { LoadState } from '@/components/LoadState'
import { SpaceLinks } from '@/components/SpaceLinks'
import { linkClass } from '@/components/styles'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIndex, useIssue } from '@/data'
import { t } from '@/i18n/zh-TW'
import { availableIssues } from '@/lib/issues'
import { findIssue, ISSUE_TABS, parseTab, tabPath, type IssueTab } from '@/lib/issuePage'
import type { AvailableIssueSummary, IndexFile } from '@/types'

const ti = t.issue

const TAB_CONTENT: Record<IssueTab, (props: IssueTabProps) => ReactNode> = {
  overview: OverviewTab,
  opinion: OpinionTab,
  stakeholders: StakeholdersTab,
  conflicts: ConflictsTab,
  solutions: SolutionsTab,
}

function BackHome() {
  return (
    <p className="mt-3">
      <Link to="/" className={linkClass}>{ti.backHome}</Link>
    </p>
  )
}

/** Issue page (design 3.2): #/issues/:number/:tab? with five tabs. */
export default function Issue() {
  const index = useIndex()
  const { number } = useParams()
  if (index.status !== 'ready') return <LoadState state={index} />

  const found = findIssue(index.data, number)
  if (found.kind === 'notFound') {
    return (
      <>
        <h1 className="text-2xl font-bold">{ti.notFoundTitle}</h1>
        <p className="mt-3">{ti.notFoundBody}</p>
        <BackHome />
      </>
    )
  }
  if (found.kind === 'unavailable') {
    return (
      <>
        <h1 className="text-2xl font-bold">{t.issueCard.numberTitle(found.issue.number, found.issue.title)}</h1>
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
  const navigate = useNavigate()
  const tab = parseTab(useParams().tab)

  // The tab is in the URL. A new history entry per tab, so the back button
  // returns to the tab before. activationMode="manual": with automatic
  // activation, Radix calls onValueChange on mouse down and again on focus,
  // which adds two history entries. Arrow keys move the focus; Enter or Space
  // opens the tab.
  const onTabChange = (value: string) => {
    const next = parseTab(value)
    if (next) navigate(tabPath(summary.number, next), { preventScrollReset: true })
  }

  return (
    <>
      <h1 className="text-2xl font-bold md:text-3xl">{t.issueCard.numberTitle(summary.number, summary.title)}</h1>
      <dl className="mt-3 space-y-1.5 text-sm">
        {summary.spaces.length > 0 && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">{ti.spaces}</dt>
            <dd><SpaceLinks spaceTypes={index.spaceTypes} codes={summary.spaces} /></dd>
          </div>
        )}
        {summary.updated && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">{ti.updated}</dt>
            <dd><time dateTime={summary.updated}>{summary.updated}</time></dd>
          </div>
        )}
      </dl>

      <Tabs value={tab ?? ''} onValueChange={onTabChange} activationMode="manual" className="mt-6">
        <TabsList aria-label={ti.tabsLabel} className="h-auto w-full flex-wrap justify-start">
          {ISSUE_TABS.map((name) => (
            <TabsTrigger key={name} value={name} className="flex-1 px-2 py-1.5 md:px-3">
              {ti.tabs[name]}
            </TabsTrigger>
          ))}
        </TabsList>
        {tab === null ? (
          <div className="mt-4 text-base">
            <p>{ti.tabNotFound}</p>
            <p className="mt-3">
              <Link to={tabPath(summary.number, 'overview')} className={linkClass}>{ti.goToOverview}</Link>
            </p>
          </div>
        ) : (
          ISSUE_TABS.map((name) => {
            const Content = TAB_CONTENT[name]
            return (
              <TabsContent key={name} value={name} className="mt-4 text-base">
                <h2 className="sr-only">{ti.tabs[name]}</h2>
                {issue.status === 'ready' ? (
                  <Content index={index} summary={summary} issue={issue.data} available={available} />
                ) : (
                  <LoadState state={issue} />
                )}
              </TabsContent>
            )
          })
        )}
      </Tabs>
    </>
  )
}
