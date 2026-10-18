import { AllStakeholders } from '@/components/AllStakeholders'
import { IssueList } from '@/components/IssueList'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { useIndex } from '@/data'
import { t } from '@/i18n/zh-TW'
import type { IndexFile } from '@/types'

const th = t.home

/** Home page. Part 1 of the UI update keeps the issue list and the
 * stakeholder list here. Part 2 replaces them with the hero and the three
 * blocks (design 3.1). The same lists are on #/issues and #/stakeholders. */
export default function Home() {
  const index = useIndex()
  return (
    <>
      <PageTitle />
      <h1 className="text-2xl font-bold md:text-3xl">{t.appTitle}</h1>
      <p className="mt-1 text-lg text-muted-foreground">{t.appSubtitle}</p>
      <p className="mt-4 leading-relaxed">{th.intro}</p>
      <div className="mt-6">
        {index.status === 'ready' ? <HomeContent index={index.data} /> : <LoadState state={index} />}
      </div>
    </>
  )
}

function HomeContent({ index }: { index: IndexFile }) {
  return (
    <div className="space-y-10">
      <section aria-labelledby="issues-heading">
        <h2 id="issues-heading" className="text-xl font-bold">{th.issuesHeading}</h2>
        <IssueList index={index} headingLevel={3} />
      </section>
      <section aria-labelledby="stakeholders-heading">
        <h2 id="stakeholders-heading" className="text-xl font-bold">{th.stakeholdersHeading}</h2>
        <div className="mt-3">
          <AllStakeholders index={index} headingLevel={3} />
        </div>
      </section>
    </div>
  )
}
