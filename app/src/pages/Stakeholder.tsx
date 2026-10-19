import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router'
import { CellText } from '@/components/CellText'
import { DataBasisEmpty, DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Field } from '@/components/Field'
import { LoadState } from '@/components/LoadState'
import { PageTabs, TabComing } from '@/components/PageTabs'
import { Markdown } from '@/components/Markdown'
import { PriorityCounts } from '@/components/PriorityCounts'
import { SolutionCard } from '@/components/SolutionCard'
import { StoryCard } from '@/components/StoryCard'
import { StoryList } from '@/components/StoryList'
import { linkClass } from '@/components/styles'
import { TagBadge } from '@/components/TagBadge'
import { Badge } from '@/components/ui/badge'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { PageTitle } from '@/components/PageTitle'
import { dataBasedOnly as onlyDataBased } from '@/lib/dataBasis'
import {
  movedStakeholderTarget, parseStakeholderTab, STAKEHOLDER_TABS, stakeholderTabPath, type StakeholderTab,
} from '@/lib/entityPaths'
import { tabPath } from '@/lib/issuePage'
import { availableIssues } from '@/lib/issues'
import { movedFrom, pathTrail, stakeholderIssueNumbers, stakeholderIssueView } from '@/lib/stakeholderPage'
import { resolveId, stakeholderName } from '@/lib/stakeholders'
import { stakeholderTabCounts, type TabCounts } from '@/lib/tabCounts'
import type { IndexFile, IssueFile, Stakeholder as StakeholderType } from '@/types'

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
    const target = movedStakeholderTarget(location.pathname, location.search, id, resolved)
    if (target) return <Navigate replace to={target} />
  }
  const stakeholder = index.data.stakeholders.find((s) => s.id === id)!
  return <StakeholderContent key={id} index={index.data} stakeholder={stakeholder} />
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
  const trail = pathTrail(s.path, index.pathLabels)
  const [dataBasedOnly] = useDataBasisFilter()
  const tab = parseStakeholderTab(useParams().tab)
  const counts = useMemo(
    () => (issues.status === 'ready' ? stakeholderTabCounts(issues.data, s.id) : null),
    [issues, s.id],
  )

  // For now (plan Task N3) the 總覽 tab has the old page content. Task N7
  // fills the other tabs.
  const overview =
    shown.length === 0 ? null : (
      <>
        <DataBasisToggle />
        <div className="mt-8 space-y-10">
          {issues.status === 'ready' ? (
            issues.data.map((issue, i) => (
              <IssueSection
                key={issue.number}
                index={index}
                issue={issue}
                id={s.id}
                first={i === 0}
                dataBasedOnly={dataBasedOnly}
              />
            ))
          ) : (
            <LoadState state={issues} />
          )}
        </div>
      </>
    )

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
        {(name) => (name === 'overview' ? overview : <TabComing text={tp.tabComing} />)}
      </PageTabs>
    </>
  )
}

function Part({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="font-semibold">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>
}

/** One issue of the stakeholder. first: show the priority legend once per
 * page. dataBasedOnly: the 「只看有資料根據」 filter for the story lists. */
function IssueSection({ index, issue, id, first, dataBasedOnly }: {
  index: IndexFile
  issue: IssueFile
  id: string
  first: boolean
  dataBasedOnly: boolean
}) {
  const v = stakeholderIssueView(issue, id)
  const stories = dataBasedOnly ? onlyDataBased(v.stories) : v.stories
  const n = issue.number
  const p = `issue-${n}`
  const name = (sid: string) => stakeholderName(index.stakeholders, sid)

  return (
    <section aria-labelledby={`${p}-heading`} className="space-y-6 border-t pt-6">
      <h2 id={`${p}-heading`} className="text-xl font-bold">
        <Link to={tabPath(n, 'overview')} className={linkClass}>{t.issueCard.numberTitle(n, issue.title)}</Link>
      </h2>

      <Part id={`${p}-relation`} title={tp.relation}>
        {v.relation ? <p><CellText cell={v.relation} /></p> : <Empty>{tp.relationNone}</Empty>}
      </Part>

      <Part id={`${p}-counts`} title={tp.priorityCounts}>
        <PriorityCounts counts={v.counts} showLegend={first} />
      </Part>

      <Part id={`${p}-stories`} title={tp.stories}>
        {v.stories.length === 0 ? (
          <Empty>{tp.storiesNone}</Empty>
        ) : stories.length === 0 ? (
          <DataBasisEmpty />
        ) : (
          <ul className="space-y-2">
            {stories.map((story) => (
              <li key={story.id}><StoryCard story={story} stakeholderName={name(story.stakeholder)} /></li>
            ))}
          </ul>
        )}
      </Part>

      <Part id={`${p}-groups`} title={tp.groups}>
        {v.groups.length === 0 ? (
          <Empty>{tp.groupsNone}</Empty>
        ) : (
          <ul className="space-y-3">
            {v.groups.map(({ group: g, others }) => (
              <li key={g.id} className="rounded-md border p-3">
                <p>
                  <span className="mr-2 font-mono font-semibold">{g.id}</span>
                  {g.tag && <TagBadge kind={g.tag} className="mr-1.5" />}
                  <Markdown text={g.summary} />
                </p>
                {others.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">{tp.groupOthersNone}</p>
                ) : (
                  <div className="mt-1 text-sm">
                    <span className="text-muted-foreground">{tp.groupOthers}</span>
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {others.map((o) => (
                        <li key={o}><Link to={`/stakeholders/${o}`} className={linkClass}>{name(o)}</Link></li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Part>

      <Part id={`${p}-conflicts`} title={tp.conflicts}>
        {v.conflicts.length === 0 ? (
          <Empty>{tp.conflictsNone}</Empty>
        ) : (
          <ul className="space-y-4">
            {v.conflicts.map(({ conflict: c, otherStories }) => (
              <li key={c.id} className="rounded-lg border p-3 md:p-4">
                <h4 className="font-semibold">
                  <span className="mr-2 font-mono">{c.id}</span>
                  <CellText cell={c.text} />
                </h4>
                <p className="mt-3 text-sm text-muted-foreground">{tp.otherSide}</p>
                <StoryList stories={otherStories} stakeholders={index.stakeholders} dataBasedOnly={dataBasedOnly} />
              </li>
            ))}
          </ul>
        )}
      </Part>

      <Part id={`${p}-solutions`} title={tp.solutions}>
        {v.solutions.length === 0 ? (
          <Empty>{tp.solutionsNone}</Empty>
        ) : (
          <ul className="space-y-3">
            {v.solutions.map((sol) => (
              <li key={sol.id}>
                <SolutionCard variant="compact" solution={sol} issueNumber={n} />
              </li>
            ))}
          </ul>
        )}
      </Part>

      <Part id={`${p}-uncovered`} title={tp.uncovered}>
        {v.uncovered.length === 0 ? (
          <Empty>{tp.uncoveredNone}</Empty>
        ) : (
          <StoryList stories={v.uncovered} stakeholders={index.stakeholders} dataBasedOnly={dataBasedOnly} />
        )}
      </Part>

      <Part id={`${p}-sources`} title={tp.inputSources}>
        {v.inputSources.length === 0 ? (
          <Empty>{tp.inputSourcesNone}</Empty>
        ) : (
          <ul className="list-disc space-y-2 pl-5">
            {v.inputSources.map((src, i) => (
              <li key={i}>
                <Markdown text={src.source} />
                <span className="block text-sm">
                  <span className="text-muted-foreground">{tp.inputFit}</span>
                  <CellText cell={src.fit} />
                </span>
                {src.note !== null && (
                  <span className="block text-sm text-muted-foreground">
                    {tp.inputNote}
                    <Markdown text={src.note} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Part>
    </section>
  )
}
