import { CellText } from '@/components/CellText'
import { DataBasisEmpty, useDataBasisFilter } from '@/components/DataBasisToggle'
import { IssueCard } from '@/components/IssueCard'
import { LabelledSection } from '@/components/LabelledSection'
import { Markdown } from '@/components/Markdown'
import { PriorityCounts } from '@/components/PriorityCounts'
import { StoryCard } from '@/components/StoryCard'
import { cardGridClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { dataBasedOnly as onlyDataBased } from '@/lib/dataBasis'
import { sharedForCard } from '@/lib/issues'
import { needKey } from '@/lib/needs'
import { stakeholderIssueView } from '@/lib/stakeholderPage'
import { stakeholderName } from '@/lib/stakeholders'
import { wantKey } from '@/lib/wantList'
import type { AvailableIssueSummary, IndexFile, IssueFile } from '@/types'
import { Empty, Part } from './IssueSection'

const tp = t.stakeholderPage

/** 議題 (design 3.3, decisions 145 and 147). One section per issue, in
 * issue number order, one column. Each section starts with the compact
 * issue card. Then the parts that were on 總覽 before decision 147:
 * 與本題的關係, the priority counts (the legend once per page), the input
 * sources, and the stories with links to their want and need on the
 * issue's tabs.
 * The cards need only index.json. issues is null while the issue files
 * load: then the tab shows only the cards. An issue whose file is not
 * loaded also shows only its card. */
export function IssuesTab({ index, shown, issues, id }: {
  index: IndexFile
  /** The issue summaries of the stakeholder, in number order. */
  shown: AvailableIssueSummary[]
  /** The loaded issue files, or null while they load. */
  issues: IssueFile[] | null
  /** The stakeholder ID. */
  id: string
}) {
  const [dataBasedOnly] = useDataBasisFilter()
  const fileOf = (n: number) => issues?.find((i) => i.number === n) ?? null
  // The legend shows with the first issue that has its parts.
  const legendAt = shown.findIndex((s) => fileOf(s.number) !== null)
  return (
    <div className="space-y-10">
      {shown.map((summary, i) => {
        const issue = fileOf(summary.number)
        const headingId = `stakeholder-issues-${summary.number}`
        return (
          <LabelledSection key={summary.number} headingId={headingId} className="space-y-6">
            {/* The card shows the title, so the h2 is for screen readers. */}
            <h2 id={headingId} className="sr-only">{t.issueCard.numberTitle(summary.number, summary.title)}</h2>
            <IssueCard
              variant="compact"
              issue={summary}
              spaceTypes={index.spaceTypes}
              shared={sharedForCard(index, summary)}
            />
            {issue !== null && (
              <IssueParts index={index} issue={issue} id={id} showLegend={i === legendAt} dataBasedOnly={dataBasedOnly} />
            )}
          </LabelledSection>
        )
      })}
    </div>
  )
}

/** The parts of one issue: 與本題的關係, the priority counts, the input
 * sources and the stories. */
function IssueParts({ index, issue, id, showLegend, dataBasedOnly }: {
  index: IndexFile
  issue: IssueFile
  id: string
  showLegend: boolean
  dataBasedOnly: boolean
}) {
  const v = stakeholderIssueView(issue, id)
  const stories = dataBasedOnly ? onlyDataBased(v.stories) : v.stories
  const p = `stakeholder-issues-${issue.number}`
  return (
    <>
      <Part id={`${p}-relation`} title={tp.relation}>
        {v.relation ? <p><CellText cell={v.relation} /></p> : <Empty>{tp.relationNone}</Empty>}
      </Part>

      <Part id={`${p}-counts`} title={tp.priorityCounts}>
        <PriorityCounts counts={v.counts} showLegend={showLegend} />
      </Part>

      <Part id={`${p}-sources`} title={tp.inputSources}>
        {v.inputSources.length === 0 ? (
          <Empty>{tp.inputSourcesNone}</Empty>
        ) : (
          <ul className="list-disc space-y-2 pl-5">
            {v.inputSources.map((src, k) => (
              <li key={k}>
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

      <Part id={`${p}-stories`} title={tp.stories}>
        {v.stories.length === 0 ? (
          <Empty>{tp.storiesNone}</Empty>
        ) : stories.length === 0 ? (
          <DataBasisEmpty />
        ) : (
          <ul className={cardGridClass}>
            {stories.map((story) => (
              <li key={story.id}>
                <StoryCard
                  story={story}
                  issue={issue}
                  stakeholderName={stakeholderName(index.stakeholders, story.stakeholder)}
                  wantKey={wantKey(issue, story)}
                  needKey={needKey(story)}
                  className="h-full"
                />
              </li>
            ))}
          </ul>
        )}
      </Part>
    </>
  )
}
