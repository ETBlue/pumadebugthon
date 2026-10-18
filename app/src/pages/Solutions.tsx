import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Field } from '@/components/Field'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { SolutionSummary } from '@/components/SolutionSummary'
import { SpaceLinks } from '@/components/SpaceLinks'
import { linkClass, toggleOnClass } from '@/components/styles'
import { ToggleCheck } from '@/components/ToggleCheck'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { tabPath } from '@/lib/issuePage'
import { availableIssues } from '@/lib/issues'
import { solutionGroups, solutionSpaceOptions } from '@/lib/solutionList'
import type { IndexFile } from '@/types'

const tl = t.lists

/** #/solutions: every solution of every analyzed issue, grouped by issue
 * (design 3.9). Issue number order, then letter order. Never by a count. */
export default function Solutions() {
  const index = useIndex()
  return (
    <>
      <PageTitle parts={[tl.solutionsTitle]} />
      <h1 className="text-2xl font-bold md:text-3xl">{tl.solutionsTitle}</h1>
      <p className="mt-2 leading-relaxed">{tl.solutionsIntro}</p>
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
      <p id={labelId} className="text-sm text-muted-foreground">
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
  const [spaces, setSpaces] = useState<string[]>([])
  const [issueKeys, setIssueKeys] = useState<string[]>([])

  if (issues.status !== 'ready') return <LoadState state={issues} />

  const spaceOptions = solutionSpaceOptions(index.spaceTypes, issues.data).map((s) => ({ value: s.code, label: s.name }))
  const issueOptions = available.map((i) => ({ value: String(i.number), label: tl.issueOption(i.number, i.title) }))
  const total = solutionGroups(issues.data, { spaces: [], issues: [] }).reduce((n, g) => n + g.solutions.length, 0)
  const groups = solutionGroups(issues.data, { spaces, issues: issueKeys.map(Number) })
  const shown = groups.reduce((n, g) => n + g.solutions.length, 0)

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

      {groups.length === 0 ? (
        <p className="mt-6">{tl.solutionsNone}</p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((g) => (
            <section key={g.issueNumber} aria-labelledby={`solutions-${g.issueNumber}`}>
              <h2 id={`solutions-${g.issueNumber}`} className="text-xl font-bold">
                <Link to={`/issues/${g.issueNumber}`} className={linkClass}>{tl.issueHeading(g.issueNumber, g.title)}</Link>
              </h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {g.solutions.map((sol) => (
                  <li key={sol.id}>
                    <SolutionSummary
                      solution={sol}
                      issueNumber={g.issueNumber}
                      linkTo={tabPath(g.issueNumber, 'solutions')}
                      linkLabel={tl.solutionLink(g.issueNumber, sol.id)}
                    >
                      <dl className="mt-2 space-y-1 text-sm">
                        {sol.spaces.length > 0 && (
                          <Field label={tl.solutionSpaces}><SpaceLinks spaceTypes={index.spaceTypes} codes={sol.spaces} /></Field>
                        )}
                        {sol.added && <Field label={tl.solutionAdded}><time dateTime={sol.added}>{sol.added}</time></Field>}
                        <Field label={tl.solutionStories}>{tl.solutionStoriesValue(sol.stories.length)}</Field>
                      </dl>
                    </SolutionSummary>
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
