import { Link } from 'react-router'
import { linkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { PageTitle } from '@/components/PageTitle'

/** A page that is not built yet, or an unknown URL. */
export default function Placeholder({ notFound = false }: { notFound?: boolean }) {
  return (
    <>
      <PageTitle parts={[notFound ? t.placeholder.notFoundTitle : t.placeholder.title]} />
      <h1 className="text-2xl font-bold">{notFound ? t.placeholder.notFoundTitle : t.placeholder.title}</h1>
      <p className="mt-3">{notFound ? t.placeholder.notFoundBody : t.placeholder.body}</p>
      <p className="mt-3">
        <Link to="/" className={linkClass}>{t.placeholder.backHome}</Link>
      </p>
    </>
  )
}
