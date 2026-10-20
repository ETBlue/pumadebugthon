import { IssueList } from '@/components/IssueList'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { useIndex } from '@/data'
import { proseClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'

/** #/issues: every issue, with the space type filter (design 3.9). */
export default function Issues() {
  const index = useIndex()
  return (
    <>
      <PageTitle parts={[t.lists.issuesTitle]} />
      <h1 className="text-2xl font-bold md:text-3xl">{t.lists.issuesTitle}</h1>
      <p className={`mt-2 leading-relaxed ${proseClass}`}>{t.lists.issuesIntro}</p>
      {/* Once on the page, not on each card (design 3.9). */}
      <p className={`mt-2 text-sm leading-relaxed text-muted-foreground ${proseClass}`}>{t.basis.listNote}</p>
      {index.status === 'ready' ? <IssueList index={index.data} headingLevel={2} /> : <LoadState state={index} />}
    </>
  )
}
