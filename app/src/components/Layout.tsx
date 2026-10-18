import type { MouseEvent, ReactNode } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { Footer } from './Footer'
import { Header } from './Header'
import { Notice } from './Notice'

// With hash URLs, href="#main" would change the route. Move focus instead.
function skipToMain(e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const main = document.getElementById('main')
  main?.focus()
  main?.scrollIntoView()
}

const container = 'mx-auto w-full max-w-5xl px-4 md:px-8'

/** Page frame: skip link, header, notice, main and footer. children replace
 * the route outlet, for the error page. */
export function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        onClick={skipToMain}
        className="sr-only rounded-md bg-background px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {t.layout.skipLink}
      </a>
      <Header container={container} />
      <main id="main" tabIndex={-1} className={`${container} flex-1 py-6 focus:outline-none`}>
        <Notice />
        <div className="mt-6">
          {children ?? <Outlet />}
        </div>
      </main>
      <Footer container={container} />
      <ScrollRestoration />
    </div>
  )
}
