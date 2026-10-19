import type { ReactNode } from 'react'
import { AUTHOR_POSTS, CONTENT_LICENSE_URL, EVENT_URL, LICENSE_URL, METHOD_URL, REPO_URL } from '@/components/links'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { linkClass } from '@/components/styles'
import { useCrossIssueOrNull, useIndex } from '@/data'
import { t } from '@/i18n/zh-TW'
import { dataFileLinks, type DataFileLink } from '@/lib/dataFiles'

const ta = t.about
const external = { rel: 'noopener noreferrer' }

function Part({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl font-bold">{title}</h2>
      <div className="mt-2 leading-relaxed">{children}</div>
    </section>
  )
}

function FileList({ label, links }: { label: string; links: DataFileLink[] }) {
  return (
    <div className="mt-3">
      <h3 className="font-semibold">{label}</h3>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} {...external} className={`${linkClass} break-all`}>
              {l.issue === null ? l.file : ta.issueFile(l.issue, l.file)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The app's own data files (design 3.13). The list comes from index.json,
 * plus cross-issue.json when it exists. */
function DataFiles() {
  const index = useIndex()
  const cross = useCrossIssueOrNull()
  if (index.status !== 'ready') return <LoadState state={index} />
  const links = dataFileLinks(index.data, import.meta.env.BASE_URL, REPO_URL, cross !== null)
  return (
    <>
      <FileList label={ta.json} links={links.json} />
      <FileList label={ta.csv} links={links.csv} />
    </>
  )
}

/** #/about: 關於本站 (design 3.13). The event page, the source code, the
 * licenses, the data files and the author's related posts. The header has
 * no link here; the footer has. */
export default function About() {
  return (
    <>
      <PageTitle parts={[ta.title]} />
      <h1 className="text-2xl font-bold md:text-3xl">{ta.title}</h1>
      <p className="mt-2 leading-relaxed">{ta.intro}</p>
      <div className="mt-8 space-y-10">
        <Part id="about-links" title={ta.linksHeading}>
          <ul className="space-y-1">
            <li>
              <a href={EVENT_URL} target="_blank" {...external} className={linkClass}>
                {ta.event}
                <span className="sr-only">{t.layout.newTab}</span>
              </a>
            </li>
            <li><a href={REPO_URL} {...external} className={linkClass}>{ta.repo}</a></li>
            <li><a href={METHOD_URL} {...external} className={linkClass}>{ta.method}</a></li>
          </ul>
        </Part>

        <Part id="about-license" title={ta.licenseHeading}>
          <ul className="space-y-1">
            <li>
              {ta.code}
              <a href={LICENSE_URL} {...external} className={linkClass}>{ta.mit}</a>
            </li>
            <li>
              {ta.content}
              <a href={CONTENT_LICENSE_URL} {...external} className={linkClass}>{ta.ccBy}</a>
            </li>
            <li>{ta.exceptions}</li>
          </ul>
        </Part>

        <Part id="about-data" title={ta.dataHeading}>
          <p>{ta.dataIntro}</p>
          <DataFiles />
          <p className="mt-3">
            {ta.dataLicense}
            <a href={CONTENT_LICENSE_URL} {...external} className={linkClass}>{ta.contentLicenseFile}</a>
            {ta.dataLicenseEnd}
          </p>
        </Part>

        <Part id="about-posts" title={ta.postsHeading}>
          <ul className="space-y-2">
            {AUTHOR_POSTS.map((p) => (
              <li key={p.url} className="flex flex-wrap items-baseline gap-x-3">
                <a href={p.url} {...external} className={linkClass}>{p.title}</a>
                <time dateTime={p.date} className="text-sm text-muted-foreground">{p.date}</time>
              </li>
            ))}
          </ul>
        </Part>
      </div>
    </>
  )
}
