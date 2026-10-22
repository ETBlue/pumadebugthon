import { useMemo } from 'react'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { SpaceCard, type SpaceCardCounts } from '@/components/SpaceCard'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { availableIssues } from '@/lib/issues'
import { issuesBySpace, solutionsBySpace, spaceGroups, spaceStakeholderCount, stakeholdersBySpace } from '@/lib/spaces'
import type { IndexFile, IssueFile } from '@/types'

const ts = t.spacesList

/** #/spaces (design 3.9, decision 120): every space type, by group, as
 * cards. The groups and the cards have a fixed order (spaceGroups), never
 * an order by a count. There is no sort, filter or search bar, so the route
 * is not full width: main gives the page column. */
export default function Spaces() {
  const index = useIndex()
  return (
    <>
      <PageTitle parts={[ts.title]} />
      {/* The highlighted header link is the visible title (decision 79). */}
      <h1 className="sr-only">{ts.title}</h1>
      {index.status === 'ready' ? <SpacesBody index={index.data} /> : <LoadState state={index} />}
    </>
  )
}

function SpacesBody({ index }: { index: IndexFile }) {
  const groups = useMemo(() => spaceGroups(index.spaceTypes), [index])
  const folders = useMemo(() => availableIssues(index).map((i) => i.folder), [index])
  const issuesState = useIssues(folders)
  const files = issuesState.status === 'ready' ? issuesState.data : null

  /** The counts of one space, from the same helpers as the space page, with
   * the same issue files (only the issues that use the space). */
  const countsOf = (code: string, numbers: number[]): SpaceCardCounts | null => {
    if (files === null) return null
    const used: IssueFile[] = files.filter((f) => numbers.includes(f.number))
    return {
      stakeholders: spaceStakeholderCount(stakeholdersBySpace(used, code)),
      solutions: solutionsBySpace(used, code).length,
    }
  }

  return (
    <>
      {/* The counts need the issue files. While they load, or when they fail,
          one line says so and the cards leave out those two fields. */}
      {issuesState.status !== 'ready' && <div className="mb-4"><LoadState state={issuesState} /></div>}
      <div className="space-y-8">
        {groups.map((g, i) => {
          const id = `space-group-${i}`
          return (
            <section key={g.group} aria-labelledby={id}>
              <h2 id={id} className="text-xl font-bold">{g.group}</h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {g.spaces.map((space) => {
                  const numbers = issuesBySpace(index, space.code).map((s) => s.number)
                  return (
                    <li key={space.code}>
                      <SpaceCard space={space} issues={numbers} titles={index.issues} counts={countsOf(space.code, numbers)} />
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}
