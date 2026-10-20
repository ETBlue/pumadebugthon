import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { SolutionCard } from '@/components/SolutionCard'
import { CrossSolutionCard } from '@/components/solution/CrossSolutionCard'
import { linkClass, proseClass, toggleOnClass } from '@/components/styles'
import { ToggleCheck } from '@/components/ToggleCheck'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useCrossIssue, useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { crossSolutionGroup, crossSolutionTabCounts, issuesOfCross } from '@/lib/crossIssue'
import { availableIssues } from '@/lib/issues'
import { coveredNeedCount, solutionGroups, solutionSpaceOptions } from '@/lib/solutionList'
import type { IndexFile } from '@/types'

const tl = t.lists

/** #/solutions: every solution of every analyzed issue, grouped by issue
 * (design 3.9). Issue number order, then letter order. Never by a count.
 * When cross-issue.json exists, the cross-issue solutions are the first
 * group, in code order (design 3.18, decision 51). */
export default function Solutions() {
  const index = useIndex()
  return (
    <>
      <PageTitle parts={[tl.solutionsTitle]} />
      <h1 className="text-2xl font-bold md:text-3xl">{tl.solutionsTitle}</h1>
      <p className={`mt-2 leading-relaxed ${proseClass}`}>{tl.solutionsIntro}</p>
      <div className="mt-4">
        {index.status === 'ready' ? <SolutionList index={index.data} /> : <LoadState state={index} />}
      </div>
    </>
  )
}

/** A toggle group filter with a label and a hint. Nothing picked = all. */
function ChipFilter({ label, hint, options, value, onChange }: {
  label: string
  hint: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  const labelId = useId()
  return (
    <div className="space-y-2">
      <p id={labelId} className={`text-sm text-muted-foreground ${proseClass}`}>
        {label}
        <span className="block text-xs">{hint}</span>
      </p>
      <ToggleGroup type="multiple" variant="outline" value={value} onValueChange={onChange} aria-labelledby={labelId} className="flex-wrap">
        {options.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} className={toggleOnClass}>
            <ToggleCheck />
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

function SolutionList({ index }: { index: IndexFile }) {
  const available = useMemo(() => availableIssues(index), [index])
  const folders = useMemo(() => available.map((i) => i.folder), [available])
  const issues = useIssues(folders)
  const crossState = useCrossIssue()
  const [spaces, setSpaces] = useState<string[]>([])
  const [issueKeys, setIssueKeys] = useState<string[]>([])

  if (issues.status !== 'ready') return <LoadState state={issues} />
  if (crossState.status === 'loading') return <LoadState state={crossState} />
  // A cross-issue file that fails to load is left out, like a missing one.
  const cross = crossState.status === 'ready' ? crossState.data : null

  const spaceOptions = solutionSpaceOptions(index.spaceTypes, issues.data, cross).map((s) => ({ value: s.code, label: s.name }))
  const issueOptions = available.map((i) => ({ value: String(i.number), label: tl.issueOption(i.number, i.title) }))
  const filter = { spaces, issues: issueKeys.map(Number) }
  const crossAll = crossSolutionGroup(cross, { spaces: [], issues: [] })
  const crossShown = crossSolutionGroup(cross, filter)
  const total = solutionGroups(issues.data, { spaces: [], issues: [] }).reduce((n, g) => n + g.solutions.length, 0) + crossAll.length
  const groups = solutionGroups(issues.data, filter)
  const shown = groups.reduce((n, g) => n + g.solutions.length, 0) + crossShown.length
  const byNumber = new Map(issues.data.map((i) => [i.number, i]))

  return (
    <>
      <section aria-label={tl.solutionsFilters} className="space-y-4">
        {spaceOptions.length > 0 && (
          <ChipFilter label={tl.solutionsSpaceFilter} hint={tl.solutionsSpaceHint} options={spaceOptions} value={spaces} onChange={setSpaces} />
        )}
        {issueOptions.length >= 2 && (
          <ChipFilter label={tl.solutionsIssueFilter} hint={tl.solutionsIssueHint} options={issueOptions} value={issueKeys} onChange={setIssueKeys} />
        )}
        <p role="status" className="text-sm text-muted-foreground">{tl.solutionsMatch(shown, total)}</p>
      </section>

      {groups.length === 0 && crossShown.length === 0 ? (
        <p className="mt-6">{tl.solutionsNone}</p>
      ) : (
        <div className="mt-6 space-y-8">
          {cross && crossShown.length > 0 && (
            <section aria-labelledby="solutions-cross">
              <h2 id="solutions-cross" className="text-xl font-bold">{t.crossIssue.groupHeading}</h2>
              <p className={`mt-1 text-sm text-muted-foreground ${proseClass}`}>{t.crossIssue.groupIntro}</p>
              <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {crossShown.map((sol) => (
                  <li key={sol.code}>
                    <CrossSolutionCard
                      solution={sol}
                      detailed={{
                        spaceTypes: index.spaceTypes,
                        coveredNeeds:
                          issuesOfCross(sol, issues.data).length === 0
                            ? null
                            : crossSolutionTabCounts(cross, sol, issues.data).needs.covered,
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {groups.map((g) => (
            <section key={g.issueNumber} aria-labelledby={`solutions-${g.issueNumber}`}>
              <h2 id={`solutions-${g.issueNumber}`} className="text-xl font-bold">
                <Link to={`/issues/${g.issueNumber}`} className={linkClass}>{tl.issueHeading(g.issueNumber, g.title)}</Link>
              </h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {g.solutions.map((sol) => (
                  <li key={sol.id}>
                    <SolutionCard
                      variant="detailed"
                      solution={sol}
                      issueNumber={g.issueNumber}
                      showIssue
                      spaceTypes={index.spaceTypes}
                      coveredNeeds={coveredNeedCount(byNumber.get(g.issueNumber)!, sol)}
                    />
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
