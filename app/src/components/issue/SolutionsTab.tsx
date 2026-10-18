import { CellText } from '@/components/CellText'
import { Markdown } from '@/components/Markdown'
import { SpaceLinks } from '@/components/SpaceLinks'
import { t } from '@/i18n/zh-TW'
import { storiesByPriority } from '@/lib/issuePage'
import { priorityLabel } from '@/lib/priority'
import { StoryList } from './ConflictsTab'
import type { IssueTabProps } from './types'

const ts = t.solutionsTab

/** 解法 (design 3.2): each solution with its summary, space types and the
 * stories it covers, grouped by priority. */
export function SolutionsTab({ index, issue }: IssueTabProps) {
  if (issue.solutions.length === 0) return <p>{ts.none}</p>
  return (
    <ul className="space-y-6">
      {issue.solutions.map((sol) => (
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
            {storiesByPriority(issue, sol.stories).map((g) => (
              <section key={g.priority} className="mt-3">
                <h5 className="text-sm font-semibold">{priorityLabel(g.priority)}</h5>
                <StoryList stories={g.stories} stakeholders={index.stakeholders} />
              </section>
            ))}
          </article>
        </li>
      ))}
    </ul>
  )
}
