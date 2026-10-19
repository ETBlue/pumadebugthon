import { CellText } from '@/components/CellText'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { StoryList } from '@/components/StoryList'
import { t } from '@/i18n/zh-TW'
import type { IssueTabProps } from './types'

const tc = t.conflictsTab

/** 衝突 (design 3.2): each conflict with both sides, the method and the simulated result. */
export function ConflictsTab({ index, issue }: IssueTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  if (issue.conflicts.length === 0) return <p>{tc.none}</p>
  const byId = new Map(issue.stories.map((s) => [s.id, s]))
  const stories = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? [])
  return (
    <>
      <DataBasisToggle className="mb-6" />
      <ul className="space-y-6">
        {issue.conflicts.map((c) => (
          <li key={c.id}>
            <article aria-labelledby={`conflict-${c.id}`} className="rounded-lg border p-4">
              <h3 id={`conflict-${c.id}`} className="text-lg font-semibold">
                <span className="mr-2 font-mono">{c.id}</span>
                <CellText cell={c.text} />
              </h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <section>
                  <h4 className="font-medium">{tc.sideA}</h4>
                  <StoryList stories={stories(c.sideA)} issueNumber={issue.number} stakeholders={index.stakeholders} dataBasedOnly={dataBasedOnly} />
                </section>
                <section>
                  <h4 className="font-medium">{tc.sideB}</h4>
                  <StoryList stories={stories(c.sideB)} issueNumber={issue.number} stakeholders={index.stakeholders} dataBasedOnly={dataBasedOnly} />
                </section>
              </div>
              <dl className="mt-4 space-y-2">
                <div>
                  <dt className="text-sm text-muted-foreground">{tc.method}</dt>
                  <dd><CellText cell={c.method} /></dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">{tc.result}</dt>
                  <dd><CellText cell={c.result} /></dd>
                </div>
              </dl>
            </article>
          </li>
        ))}
      </ul>
    </>
  )
}
