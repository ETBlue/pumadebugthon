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
import { availableIssues } from '@/lib/issues'
import { needGroups, needPickKey } from '@/lib/needs'
import { stakeholderName } from '@/lib/stakeholders'
import { opinionPickTo } from '@/lib/wants'
import type { IndexFile } from '@/types'

const tl = t.lists

/** #/needs: the 以便… cell of every story of every analyzed issue, grouped
 * by issue (design 3.9). Built like #/wants. Each item links to the opinion
 * check with the story's pick item picked. Issue order, then story order,
 * never by a count. */
export default function Needs() {
  const index = useIndex()
  return (
    <>
      <PageTitle parts={[tl.needsTitle]} />
      <h1 className="text-2xl font-bold md:text-3xl">{tl.needsTitle}</h1>
      <p className="mt-2 leading-relaxed">{tl.needsIntro}</p>
      <p className="mt-1 leading-relaxed">{tl.needsPickHint}</p>
      <div className="mt-4">
        {index.status === 'ready' ? <NeedList index={index.data} /> : <LoadState state={index} />}
      </div>
    </>
  )
}

function NeedList({ index }: { index: IndexFile }) {
  const folders = useMemo(() => availableIssues(index).map((i) => i.folder), [index])
  const issues = useIssues(folders)
  const [dataBasedOnly] = useDataBasisFilter()
  const [query, setQuery] = useState('')
  const searchId = useId()
  const hintId = useId()

  if (issues.status !== 'ready') return <LoadState state={issues} />

  const listed = needGroups(issues.data, { query: '', dataBasedOnly })
  const groups = needGroups(issues.data, { query, dataBasedOnly })
  const count = (gs: typeof groups) => gs.reduce((n, g) => n + g.stories.length, 0)
  const issueOf = (n: number) => issues.data.find((i) => i.number === n)!

  return (
    <>
      <div className="space-y-4">
        <DataBasisToggle />
        <div className="space-y-2">
          <label htmlFor={searchId} className="block font-medium">{tl.needsSearchLabel}</label>
          <p id={hintId} className="text-sm text-muted-foreground">{tl.needsSearchHint}</p>
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby={hintId}
          />
          <p role="status" className="text-sm text-muted-foreground">{tl.needsMatch(count(groups), count(listed))}</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="mt-6">{count(listed) === 0 ? t.dataBasisFilter.pickEmpty : tl.needsNone}</p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((g) => (
            <section key={g.issueNumber} aria-labelledby={`needs-${g.issueNumber}`}>
              <h2 id={`needs-${g.issueNumber}`} className="text-xl font-bold">
                <Link to={`/issues/${g.issueNumber}`} className={linkClass}>{tl.issueHeading(g.issueNumber, g.title)}</Link>
              </h2>
              <ul className="mt-2 divide-y">
                {g.stories.map((story) => (
                  <li key={story.id} className="py-2.5">
                    <Link
                      to={opinionPickTo(g.issueNumber, needPickKey(issueOf(g.issueNumber), story), dataBasedOnly)}
                      className={linkClass}
                    >
                      <PickLabel item={{ label: story.soThat.text, tag: story.soThat.tag, pending: story.soThat.pending }} />
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{story.id}</span>
                      {' · '}
                      <Link to={`/stakeholders/${story.stakeholder}`} className={linkClass}>
                        {stakeholderName(index.stakeholders, story.stakeholder)}
                      </Link>
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
