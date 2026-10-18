import { Link } from 'react-router'
import { PageTitle } from '@/components/PageTitle'
import { linkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'

/** The page shown when a page breaks while it renders (the errorElement of
 * the root route). It never shows the error or a stack trace. */
export default function RouteError() {
  return (
    <>
      <PageTitle parts={[t.routeError.title]} />
      <h1 className="text-2xl font-bold">{t.routeError.title}</h1>
      <p role="alert" className="mt-3">{t.routeError.body}</p>
      <p className="mt-3">
        <Link to="/" className={linkClass}>{t.routeError.backHome}</Link>
      </p>
    </>
  )
}
