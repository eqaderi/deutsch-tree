import { Suspense } from 'react'
import { createHashRouter, Link, Outlet, RouterProvider, ScrollRestoration } from 'react-router'
import { LanguageProvider, useLanguage } from '../language/index.tsx'
import { LanguageSwitch } from './LanguageSwitch.tsx'
import { NodePage } from './NodePage.tsx'
import { NotFound } from './NotFound.tsx'
import { OverviewPage } from './OverviewPage.tsx'
import { ReferenceLinks } from './ReferenceLinks.tsx'
import { SearchPage } from './SearchPage.tsx'
import { TestPage } from './TestPage.tsx'
import { TreePage } from './TreePage.tsx'

/**
 * Addresses live after the "#" (…/deutsch-tree/#/node/grammar-001). The site
 * is plain files with no server behind it, so this is what lets a direct link
 * or a reload work on GitHub Pages and from a folder on a local computer.
 */
const router = createHashRouter([
  {
    element: <Frame />,
    children: [
      {
        errorElement: <LoadFailed />,
        children: [
          { index: true, element: <TreePage /> },
          { path: 'node/:id', element: <NodePage /> },
          { path: 'node/:id/test', element: <TestPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'overview', element: <OverviewPage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])

export function App() {
  // The language sits above the router: changing it re-renders the page that
  // is open and never moves the learner to another one.
  return (
    <LanguageProvider>
      <RouterProvider router={router} />
    </LanguageProvider>
  )
}

function Frame() {
  const { strings } = useLanguage()
  return (
    <>
      <header className="wrap topbar">
        <Link to="/" className="logo">
          {strings.appName}
        </Link>
        <ReferenceLinks />
        <LanguageSwitch />
      </header>
      <Suspense
        fallback={
          <main className="wrap">
            <p className="secondary">{strings.loading}</p>
          </main>
        }
      >
        <Outlet />
      </Suspense>
      <ScrollRestoration />
    </>
  )
}

function LoadFailed() {
  const { strings } = useLanguage()
  return (
    <main className="wrap">
      <section className="panel message">
        <p>{strings.loadFailed}</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          {strings.tryAgain}
        </button>
      </section>
    </main>
  )
}
