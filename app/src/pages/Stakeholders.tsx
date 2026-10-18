import { AllStakeholders } from '@/components/AllStakeholders'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { useIndex } from '@/data'
import { t } from '@/i18n/zh-TW'

/** #/stakeholders: every active stakeholder of every analyzed issue
 * (design 3.9). Tree order or ID order, never by a count. */
export default function Stakeholders() {
  const index = useIndex()
  return (
    <>
      <PageTitle parts={[t.lists.stakeholdersTitle]} />
      <h1 className="text-2xl font-bold md:text-3xl">{t.lists.stakeholdersTitle}</h1>
      <p className="mt-2 leading-relaxed">{t.lists.stakeholdersIntro}</p>
      <div className="mt-4">
        {index.status === 'ready' ? <AllStakeholders index={index.data} headingLevel={2} /> : <LoadState state={index} />}
      </div>
    </>
  )
}
