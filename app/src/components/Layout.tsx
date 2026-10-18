import type { MouseEvent, ReactNode } from 'react'
import { Outlet, ScrollRestoration, useMatches } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { isFullWidth } from '@/lib/layout'
import { Footer } from './Footer'
import { Header } from './Header'
import { Notice } from './Notice'
import { containerClass } from './styles'

// With hash URLs, href="#main" would change the route. Move focus instead.
function skipToMain(e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const main = document.getElementById('main')
  main?.focus()
  main?.scrollIntoView()
}

/** Page frame: skip link, header, notice, main and footer. children
 * replace the route outlet, for the error page. A route with
 * handle.fullWidth (the home page) gets a full-width main and places its
 * own centered column. */
export function Layout({ children }: { children?: ReactNode }) {
  const fullWidth = isFullWidth(useMatches())
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        onClick={skipToMain}
        className="sr-only rounded-md bg-background px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {t.layout.skipLink}
      </a>
      <Header container={containerClass} />
      <main
        id="main"
        tabIndex={-1}
        className={`flex-1 focus:outline-none ${fullWidth && !children ? '' : `${containerClass} py-6`}`}
      >
        <div className={fullWidth && !children ? `${containerClass} pt-6` : ''}>
          <Notice />
        </div>
        <div className="mt-6">
          {children ?? <Outlet />}
        </div>
      </main>
      <Footer container={containerClass} />
      <ScrollRestoration />
    </div>
  )
}
