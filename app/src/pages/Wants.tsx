import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { PickLabel } from '@/components/PickLabel'
import { linkClass } from '@/components/styles'
import { Input } from '@/components/ui/input'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { dataBasedCount } from '@/lib/dataBasis'
import { availableIssues } from '@/lib/issues'
import { opinionPickTo, wantGroups } from '@/lib/wants'
import type { IndexFile } from '@/types'

const tl = t.lists

/** #/wants: every 訴求 of every analyzed issue, grouped by issue (design 3.9).
 * The items are the opinion check pick list. Each links to the opinion check
 * with that item picked. Pick list order, never by a count. */
export default function Wants() {
  const index = useIndex()
  return (
    <>
      <PageTitle parts={[tl.wantsTitle]} />
      <h1 className="text-2xl font-bold md:text-3xl">{tl.wantsTitle}</h1>
      <p className="mt-2 leading-relaxed">{tl.wantsIntro}</p>
      <p className="mt-1 leading-relaxed">{tl.wantsPickHint}</p>
      <div className="mt-4">
        {index.status === 'ready' ? <WantList index={index.data} /> : <LoadState state={index} />}
      </div>
    </>
  )
}

function WantList({ index }: { index: IndexFile }) {
  const folders = useMemo(() => availableIssues(index).map((i) => i.folder), [index])
  const issues = useIssues(folders)
  const [dataBasedOnly] = useDataBasisFilter()
  const [query, setQuery] = useState('')
  const searchId = useId()
  const hintId = useId()

  if (issues.status !== 'ready') return <LoadState state={issues} />

  const listed = wantGroups(issues.data, { query: '', dataBasedOnly })
  const groups = wantGroups(issues.data, { query, dataBasedOnly })
  const count = (gs: typeof groups) => gs.reduce((n, g) => n + g.items.length, 0)
  const storiesOf = (n: number) => issues.data.find((i) => i.number === n)?.stories ?? []

  return (
    <>
      <div className="space-y-4">
        <DataBasisToggle />
        <div className="space-y-2">
          <label htmlFor={searchId} className="block font-medium">{tl.wantsSearchLabel}</label>
          <p id={hintId} className="text-sm text-muted-foreground">{tl.wantsSearchHint}</p>
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby={hintId}
          />
          <p role="status" className="text-sm text-muted-foreground">{tl.wantsMatch(count(groups), count(listed))}</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="mt-6">{count(listed) === 0 ? t.dataBasisFilter.pickEmpty : tl.wantsNone}</p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((g) => (
            <section key={g.issueNumber} aria-labelledby={`wants-${g.issueNumber}`}>
              <h2 id={`wants-${g.issueNumber}`} className="text-xl font-bold">
                <Link to={`/issues/${g.issueNumber}`} className={linkClass}>{tl.issueHeading(g.issueNumber, g.title)}</Link>
              </h2>
              <ul className="mt-2 divide-y">
                {g.items.map((item) => (
                  <li key={item.key} className="py-2.5">
                    <Link to={opinionPickTo(g.issueNumber, item.key, dataBasedOnly)} className={linkClass}>
                      <PickLabel item={item} />
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{item.key}</span>
                      {' · '}
                      {tl.wantStories(item.storyIds.length)}
                      {dataBasedOnly && (
                        <>
                          {' · '}
                          {t.dataBasisFilter.countInItem(dataBasedCount(item, storiesOf(g.issueNumber)))}
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
