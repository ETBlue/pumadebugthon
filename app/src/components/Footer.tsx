import { Link } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { linkClass } from './styles'
import { TagBadge } from './TagBadge'

const tf = t.footer
const heading = 'text-sm font-semibold'

/** The page footer (design 3.8), in this order: what the app is, the
 * disclaimer, and a link to the about page. The disclaimer is the only
 * notice on the page (design 3.5). The project links, licenses and data
 * files are on the about page (design 3.13). */
export function Footer({ container }: { container: string }) {
  return (
    <footer className="border-t">
      <div className={`${container} grid gap-6 py-6 text-sm leading-relaxed md:grid-cols-2`}>
        <section aria-labelledby="footer-context">
          <h2 id="footer-context" className={heading}>{tf.contextHeading}</h2>
          <p className="mt-1">{tf.context}</p>
        </section>
        <section aria-labelledby="footer-disclaimer">
          <h2 id="footer-disclaimer" className={heading}>{tf.disclaimerHeading}</h2>
          <p className="mt-1">{tf.personal}</p>
          <p className="mt-1">
            <TagBadge kind="AI模擬" className="mr-1" />
            {tf.simulated}
          </p>
          <p className="mt-1">
            <TagBadge kind="AI整理" className="mr-1" />
            {tf.summary}
          </p>
        </section>
        <nav aria-label={tf.nav} className="md:col-span-2">
          <Link to="/about" className={`${linkClass} inline-flex min-h-10 items-center font-medium`}>{tf.about}</Link>
        </nav>
      </div>
    </footer>
  )
}
