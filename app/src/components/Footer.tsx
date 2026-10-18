import { useIndex } from '@/data'
import { t } from '@/i18n/zh-TW'
import { dataFileLinks, type DataFileLink } from '@/lib/dataFiles'
import { CONTENT_LICENSE_URL, LICENSE_URL, METHOD_URL, REPO_URL } from './links'
import { linkClass } from './styles'
import { TagBadge } from './TagBadge'

const tf = t.footer
const heading = 'text-sm font-semibold'
const external = { rel: 'noopener noreferrer' }

function FileList({ label, links }: { label: string; links: DataFileLink[] }) {
  return (
    <div className="mt-2">
      <h3 className="text-sm font-medium">{label}</h3>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} {...external} className={`${linkClass} break-all`}>
              {l.issue === null ? l.file : tf.issueFile(l.issue, l.file)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The app's own data files (design 3.8). Shown when index.json is loaded. */
function DataFiles() {
  const index = useIndex()
  if (index.status !== 'ready') return null
  const links = dataFileLinks(index.data, import.meta.env.BASE_URL, REPO_URL)
  return (
    <section aria-labelledby="footer-data">
      <h2 id="footer-data" className={heading}>{tf.dataHeading}</h2>
      <p className="mt-1">{tf.dataIntro}</p>
      <FileList label={tf.json} links={links.json} />
      <FileList label={tf.csv} links={links.csv} />
      <p className="mt-2">
        {tf.dataLicense}
        <a href={CONTENT_LICENSE_URL} {...external} className={linkClass}>{tf.contentLicenseFile}</a>
        {tf.dataLicenseEnd}
      </p>
    </section>
  )
}

/** The page footer (design 3.8): project links, licenses, disclaimer and
 * the app's data files. */
export function Footer({ container }: { container: string }) {
  return (
    <footer className="border-t">
      <div className={`${container} grid gap-6 py-6 text-sm leading-relaxed md:grid-cols-2`}>
        <nav aria-label={t.layout.footerNav}>
          <h2 className={heading}>{t.layout.footerNav}</h2>
          <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
            <li><a href={REPO_URL} {...external} className={linkClass}>{t.layout.repo}</a></li>
            <li><a href={METHOD_URL} {...external} className={linkClass}>{t.layout.method}</a></li>
          </ul>
        </nav>
        <section aria-labelledby="footer-license">
          <h2 id="footer-license" className={heading}>{tf.licenseHeading}</h2>
          <ul className="mt-1 space-y-1">
            <li>
              {tf.code}
              <a href={LICENSE_URL} {...external} className={linkClass}>{tf.mit}</a>
            </li>
            <li>
              {tf.content}
              <a href={CONTENT_LICENSE_URL} {...external} className={linkClass}>{tf.ccBy}</a>
            </li>
            <li>{tf.exceptions}</li>
          </ul>
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
        <DataFiles />
      </div>
    </footer>
  )
}
