import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { LoadState } from '@/components/LoadState'
import {
  ConflictsTab, OverviewTab, SameNeedsTab, SolutionsTab, StakeholdersTab, StoriesTab,
} from '@/components/need/NeedTabs'
import { PageBand, PageBody, type BackTarget } from '@/components/PageBand'
import { PageTabs } from '@/components/PageTabs'
import { PageTitle } from '@/components/PageTitle'
import { targetLinkClass } from '@/components/styles'
import { TagBadge } from '@/components/TagBadge'
import { useCrossIssue, useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { backListPath } from '@/lib/backLink'
import { needPath, parseNeedTab, type NeedTab } from '@/lib/entityPaths'
import { availableIssues } from '@/lib/issues'
import { stripMarkdown } from '@/lib/markdown'
import { needPageTabs, needPageView, needTabCounts, type NeedTabCounts } from '@/lib/needPage'
import { parseNeedKey } from '@/lib/needRecords'
import type { TabLabel } from '@/lib/tabLabel'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'

const tp = t.needPage
const tn = t.needsList

/** The back button of the band (decision 111): the need list, with the
 * sort, filters and search the reader last used there in this session. */
const backToNeeds = (): BackTarget => ({ to: backListPath('needs'), label: t.backLink.needs })

/** The page for an unknown or a malformed key. No redirect. */
function NotFound({ needKey }: { needKey: string }) {
  return (
    <PageBody>
      <PageTitle parts={[tp.notFoundTitle]} />
      <h1 className="text-2xl font-bold">{tp.notFoundTitle}</h1>
      <p className="mt-3">{tp.notFoundBody(needKey)}</p>
      <ul className="mt-3 space-y-1">
        <li><Link to="/needs" className={targetLinkClass}>{tp.allNeedsLink}</Link></li>
        <li><Link to="/" className={targetLinkClass}>{tp.backHome}</Link></li>
      </ul>
    </PageBody>
  )
}

/** Need page (plan-needs.md, Task N4): #/needs/:key/:tab?, for example
 * #/needs/1-N01 or #/needs/2-O04-US02/stories. One need of one issue, with
 * the tabs 總覽, 使用者故事, 利害關係人, 解法, 衝突 and 其他議題的相同需求. A tab
 * with no content is left out. The page belongs to the 需求 menu item. */
export default function Need() {
  const index = useIndex()
  const { key = '' } = useParams()
  if (index.status !== 'ready') return <PageBody><LoadState state={index} /></PageBody>
  const parsed = parseNeedKey(key)
  // A malformed key, or an issue with no analysis, is not found before any
  // issue file loads.
  if (parsed === null || !availableIssues(index.data).some((i) => i.number === parsed.issue)) {
    return <NotFound needKey={key} />
  }
  return <NeedLoader key={key} index={index.data} needKey={key} />
}

/** Loads every analyzed issue and cross-issue.json, like #/needs: the
 * cross-issue conflicts and 其他議題的相同需求 show needs and stories of
 * other issues. A cross-issue file that fails to load is left out, like a
 * missing one. */
function NeedLoader({ index, needKey }: { index: IndexFile; needKey: string }) {
  const folders = useMemo(() => availableIssues(index).map((i) => i.folder), [index])
  const issues = useIssues(folders)
  const cross = useCrossIssue()
  if (issues.status !== 'ready') return <PageBody><LoadState state={issues} /></PageBody>
  if (cross.status === 'loading') return <PageBody><LoadState state={cross} /></PageBody>
  return (
    <NeedContent
      index={index}
      issues={issues.data}
      cross={cross.status === 'ready' ? cross.data : null}
      needKey={needKey}
    />
  )
}

/** The tab label with its count. 總覽 has no count. */
function tabLabel(tab: NeedTab, counts: NeedTabCounts): TabLabel {
  return tab === 'overview' ? { main: tp.tabs.overview } : tp.tabLabels[tab](counts[tab])
}

function NeedContent({ index, issues, cross, needKey }: {
  index: IndexFile
  issues: IssueFile[]
  cross: CrossIssueFile | null
  needKey: string
}) {
  const view = useMemo(() => needPageView(issues, cross, needKey), [issues, cross, needKey])
  const parsedTab = parseNeedTab(useParams().tab)
  if (view === null) return <NotFound needKey={needKey} />
  const counts = needTabCounts(view)
  const tabs = needPageTabs(counts)
  // A tab that the need does not have is an unknown tab.
  const tab = parsedTab !== null && tabs.includes(parsedTab) ? parsedTab : null
  const { item } = view
  const code = tn.code(item.issue, item.need.id)
  const summary = item.summary

  return (
    <>
      <PageTitle parts={[`${code} ${stripMarkdown(summary.text)}`, tab && tab !== 'overview' ? tp.tabs[tab] : null, tp.titlePart]} />
      <PageBand back={backToNeeds()}>
        <span className="mr-1 font-mono">{code}</span>{' '}
        {!summary.pending && summary.tag && <TagBadge kind={summary.tag} className="mr-1.5" />}
        {stripMarkdown(summary.text)}
      </PageBand>

      <PageBody>
        <PageTabs
          label={tp.tabsLabel}
          tabs={tabs}
          current={tab}
          nameOf={(name) => tp.tabs[name]}
          labelOf={(name) => tabLabel(name, counts)}
          scrollOnPhone
          pathOf={(name) => needPath(needKey, name)}
          notFound={tp.tabNotFound}
          overviewPath={needPath(needKey)}
          overviewLink={tp.goToOverview}
        >
          {(name) => {
            const props = { index, view }
            switch (name) {
              case 'overview': return <OverviewTab view={view} />
              case 'stories': return <StoriesTab {...props} />
              case 'stakeholders': return <StakeholdersTab {...props} />
              case 'solutions': return <SolutionsTab {...props} />
              case 'conflicts': return <ConflictsTab {...props} issues={issues} cross={cross} />
              case 'sameNeeds': return <SameNeedsTab {...props} />
            }
          }}
        </PageTabs>
      </PageBody>
    </>
  )
}
