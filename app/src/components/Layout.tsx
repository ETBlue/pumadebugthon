import type { MouseEvent } from 'react'
import { Link, Outlet, ScrollRestoration } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { METHOD_URL as METHOD, REPO_URL as REPO } from './links'
import { Notice } from './Notice'
import { linkClass } from './styles'

// With hash URLs, href="#main" would change the route. Move focus instead.
function skipToMain(e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const main = document.getElementById('main')
  main?.focus()
  main?.scrollIntoView()
}

const container = 'mx-auto w-full max-w-5xl px-4 md:px-8'

/** Page frame: skip link, header, notice, main and footer. */
export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        onClick={skipToMain}
        className="sr-only rounded-md bg-background px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {t.layout.skipLink}
      </a>
      <header className="border-b">
        <div className={`${container} py-3`}>
          <Link to="/" className="rounded-sm text-lg font-bold">
            {t.appTitle}
          </Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className={`${container} flex-1 py-6 focus:outline-none`}>
        <Notice />
        <div className="mt-6">
          <Outlet />
        </div>
      </main>
      <footer className="border-t">
        <nav aria-label={t.layout.footerNav} className={`${container} py-4 text-sm`}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li><a href={REPO} rel="noopener noreferrer" className={linkClass}>{t.layout.repo}</a></li>
            <li><a href={METHOD} rel="noopener noreferrer" className={linkClass}>{t.layout.method}</a></li>
          </ul>
        </nav>
      </footer>
      <ScrollRestoration />
    </div>
  )
}
