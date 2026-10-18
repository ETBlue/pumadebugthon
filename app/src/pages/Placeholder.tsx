import { Link } from 'react-router'
import { linkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { PageTitle } from '@/components/PageTitle'

/** The page for an unknown URL. */
export default function Placeholder() {
  return (
    <>
      <PageTitle parts={[t.placeholder.notFoundTitle]} />
      <h1 className="text-2xl font-bold">{t.placeholder.notFoundTitle}</h1>
      <p className="mt-3">{t.placeholder.notFoundBody}</p>
      <p className="mt-3">
        <Link to="/" className={linkClass}>{t.placeholder.backHome}</Link>
      </p>
    </>
  )
}
