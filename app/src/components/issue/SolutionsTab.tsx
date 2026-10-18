import { CellText } from '@/components/CellText'
import { EvidenceEmpty, EvidenceToggle, useEvidenceOnly } from '@/components/EvidenceToggle'
import { Markdown } from '@/components/Markdown'
import { SpaceLinks } from '@/components/SpaceLinks'
import { StoryList } from '@/components/StoryList'
import { t } from '@/i18n/zh-TW'
import { evidenceOnly as onlyEvidence } from '@/lib/evidence'
import { storiesByPriority } from '@/lib/issuePage'
import { priorityLabel } from '@/lib/priority'
import type { IssueTabProps } from './types'

const ts = t.solutionsTab

/** 解法 (design 3.2): each solution with its summary, space types and the
 * stories it covers, grouped by priority. */
export function SolutionsTab({ index, issue }: IssueTabProps) {
  const [evidenceOnly] = useEvidenceOnly()
  if (issue.solutions.length === 0) return <p>{ts.none}</p>
  const evidenceIds = new Set(onlyEvidence(issue.stories).map((s) => s.id))
  return (
    <>
      <EvidenceToggle className="mb-6" />
      <ul className="space-y-6">
        {issue.solutions.map((sol) => {
          const ids = evidenceOnly ? sol.stories.filter((id) => evidenceIds.has(id)) : sol.stories
          const groups = storiesByPriority(issue, ids)
          return (
            <li key={sol.id}>
              <article aria-labelledby={`solution-${sol.id}`} className="rounded-lg border p-4">
                <h3 id={`solution-${sol.id}`} className="text-lg font-semibold">
                  <span className="mr-2 font-mono">{sol.id}</span>
                  <CellText cell={sol.name} />
                </h3>
                <p className="mt-2"><Markdown text={sol.summary} /></p>
                {sol.spaces.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-2 text-sm">
                    <span className="text-muted-foreground">{ts.spaces}</span>
                    <SpaceLinks spaceTypes={index.spaceTypes} codes={sol.spaces} />
                  </div>
                )}
                <h4 className="mt-4 font-medium">{ts.stories}</h4>
                {evidenceOnly && groups.length === 0 && sol.stories.length > 0 && <EvidenceEmpty />}
                {groups.map((g) => (
                  <section key={g.priority} className="mt-3">
                    <h5 className="text-sm font-semibold">{priorityLabel(g.priority)}</h5>
                    <StoryList stories={g.stories} stakeholders={index.stakeholders} />
                  </section>
                ))}
              </article>
            </li>
          )
        })}
      </ul>
    </>
  )
}
