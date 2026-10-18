import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { IssueCard } from '@/components/IssueCard'
import { LoadState } from '@/components/LoadState'
import { StakeholderList } from '@/components/StakeholderList'
import { toggleOnClass } from '@/components/styles'
import { ToggleCheck } from '@/components/ToggleCheck'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { availableIssues, filterIssuesBySpace, sharedStakeholders, usedSpaceTypes } from '@/lib/issues'
import type { IndexFile } from '@/types'

const th = t.home

/** Home page (design 3.1): the issue list and the stakeholder list. */
export default function Home() {
  const index = useIndex()
  return (
    <>
      <h1 className="text-2xl font-bold md:text-3xl">{t.appTitle}</h1>
      <p className="mt-2 leading-relaxed">{th.intro}</p>
      <div className="mt-6">
        {index.status === 'ready' ? <HomeContent index={index.data} /> : <LoadState state={index} />}
      </div>
    </>
  )
}

function HomeContent({ index }: { index: IndexFile }) {
  const available = useMemo(() => availableIssues(index), [index])
  const folders = useMemo(() => available.map((i) => i.folder), [available])
  const issues = useIssues(folders)
  const spaceOptions = useMemo(() => usedSpaceTypes(index), [index])
  const [spaces, setSpaces] = useState<string[]>([])
  const shownIssues = filterIssuesBySpace(index.issues, spaces)
  const multi = available.length >= 2

  // The 只看跨議題 filter is in the URL (#/?cross=1), so an issue card can link to it.
  const [params, setParams] = useSearchParams()
  const crossIssueOnly = params.get('cross') === '1'
  const setCrossIssueOnly = (on: boolean) =>
    setParams(on ? { cross: '1' } : {}, { replace: true, preventScrollReset: true })

  // An issue card link asks to move to the stakeholder list.
  const location = useLocation()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if ((location.state as { focus?: string } | null)?.focus === 'stakeholders') {
      heading.current?.focus()
      heading.current?.scrollIntoView()
    }
  }, [location.key, location.state])

  const spaceLabelId = 'space-filter-label'
  return (
    <div className="space-y-10">
      <section aria-labelledby="issues-heading">
        <h2 id="issues-heading" className="text-xl font-bold">{th.issuesHeading}</h2>
        {spaceOptions.length > 0 && (
          <div className="mt-3 space-y-2">
            <p id={spaceLabelId} className="text-sm text-muted-foreground">
              {th.spaceFilter}
              <span className="block text-xs">{th.spaceFilterHint}</span>
            </p>
            <ToggleGroup
              type="multiple"
              variant="outline"
              value={spaces}
              onValueChange={setSpaces}
              aria-labelledby={spaceLabelId}
              className="flex-wrap"
            >
              {spaceOptions.map((s) => (
                <ToggleGroupItem key={s.code} value={s.code} className={toggleOnClass}>
                  <ToggleCheck />
                  {s.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
        {shownIssues.length === 0 ? (
          <p className="mt-4">{th.noIssues}</p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {shownIssues.map((issue) => (
              <li key={issue.number}>
                <IssueCard
                  issue={issue}
                  spaceTypes={index.spaceTypes}
                  shared={multi && issue.available ? sharedStakeholders(index.stakeholders, issue.number) : null}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="stakeholders-heading">
        <h2 id="stakeholders-heading" ref={heading} tabIndex={-1} className="text-xl font-bold">
          {th.stakeholdersHeading}
        </h2>
        <div className="mt-3">
          {issues.status === 'ready' ? (
            <StakeholderList
              stakeholders={index.stakeholders}
              pathLabels={index.pathLabels}
              issues={issues.data}
              showCrossIssueFilter={multi}
              crossIssueOnly={crossIssueOnly}
              onCrossIssueOnlyChange={setCrossIssueOnly}
            />
          ) : (
            <LoadState state={issues} />
          )}
        </div>
      </section>
    </div>
  )
}
