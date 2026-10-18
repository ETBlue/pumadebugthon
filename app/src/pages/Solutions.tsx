import { Link } from 'react-router'
import { PageTitle } from '@/components/PageTitle'
import { linkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'

/** #/solutions: the solution list (design 3.9). Part 2 of the UI update
 * fills it. For now it says it is being made, and points to the issues. */
export default function Solutions() {
  return (
    <>
      <PageTitle parts={[t.lists.solutionsTitle]} />
      <h1 className="text-2xl font-bold md:text-3xl">{t.lists.solutionsTitle}</h1>
      <p className="mt-2 leading-relaxed">{t.lists.solutionsInProgress}</p>
      <p className="mt-3">
        <Link to="/issues" className={linkClass}>{t.lists.toIssues}</Link>
      </p>
    </>
  )
}
