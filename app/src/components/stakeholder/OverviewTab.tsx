import { CellText } from '@/components/CellText'
import { DataBasisEmpty, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Markdown } from '@/components/Markdown'
import { PriorityCounts } from '@/components/PriorityCounts'
import { StoryCard } from '@/components/StoryCard'
import { t } from '@/i18n/zh-TW'
import { dataBasedOnly as onlyDataBased } from '@/lib/dataBasis'
import { needKey } from '@/lib/needs'
import { stakeholderIssueView } from '@/lib/stakeholderPage'
import { stakeholderName } from '@/lib/stakeholders'
import { wantKey } from '@/lib/wantList'
import { Empty, IssueSection, Part, type StakeholderTabProps } from './IssueSection'

const tp = t.stakeholderPage

/** 總覽 (design 3.3). Per issue: 與本題的關係, the priority counts (the
 * legend once per page), the input sources, and the stories with links to
 * their want and need on the issue's tabs. The metadata above this tab
 * (ID, 分類路徑, 特別關注, issues, 資料根據 over every analyzed issue,
 * 新增日期 and 更新日期; decisions 111 and 118) is `StakeholderMeta` in
 * `src/pages/Stakeholder.tsx`, because it shows while the issues load. */
export function OverviewTab({ index, issues, id }: StakeholderTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  return (
    <div className="space-y-10">
      {issues.map((issue, i) => {
        const v = stakeholderIssueView(issue, id)
        const stories = dataBasedOnly ? onlyDataBased(v.stories) : v.stories
        const p = `stakeholder-overview-${issue.number}`
        return (
          <IssueSection key={issue.number} issue={issue} tab="overview">
            <Part id={`${p}-relation`} title={tp.relation}>
              {v.relation ? <p><CellText cell={v.relation} /></p> : <Empty>{tp.relationNone}</Empty>}
            </Part>

            <Part id={`${p}-counts`} title={tp.priorityCounts}>
              <PriorityCounts counts={v.counts} showLegend={i === 0} />
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
                <ul className="space-y-2">
                  {stories.map((story) => (
                    <li key={story.id}>
                      <StoryCard
                        story={story}
                        issue={issue}
                        stakeholderName={stakeholderName(index.stakeholders, story.stakeholder)}
                        wantKey={wantKey(issue, story)}
                        needKey={needKey(story)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Part>
          </IssueSection>
        )
      })}
    </div>
  )
}
