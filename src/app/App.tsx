import { lazy, Suspense } from 'react'
import { createHashRouter, Link, Outlet, RouterProvider, ScrollRestoration } from 'react-router'
import { LanguageProvider, useLanguage } from '../language/index.tsx'
import { BackupPage } from './BackupPage.tsx'
import { CheckpointPage } from './CheckpointPage.tsx'
import { LanguageSwitch } from './LanguageSwitch.tsx'
import { NodePage } from './NodePage.tsx'
import { NotFound } from './NotFound.tsx'
import { OverviewPage } from './OverviewPage.tsx'
import { progressProblem } from './progress.ts'
import { ReadinessPage } from './ReadinessPage.tsx'
import { ReferenceLinks } from './ReferenceLinks.tsx'
import { SearchPage } from './SearchPage.tsx'
import { TestPage } from './TestPage.tsx'
import { TreePage } from './TreePage.tsx'

// The private exam view loads only when it is opened: it brings PDF.js and the pack format's checks.
const PacksPage = lazy(() => import('./PacksPage.tsx').then((module) => ({ default: module.PacksPage })))
const PackExamPage = lazy(() => import('./PackExamPage.tsx').then((module) => ({ default: module.PackExamPage })))

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
          { path: 'backup', element: <BackupPage /> },
          { path: 'checkpoint/:level', element: <CheckpointPage /> },
          { path: 'readiness', element: <ReadinessPage /> },
          { path: 'packs', element: <PacksPage /> },
          { path: 'packs/:pack/:exam/:module', element: <PackExamPage /> },
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
      {progressProblem && <NewerVersionNotice />}
      <Suspense
        fallback={
          <main className="wrap">
            <p className="secondary">{strings.loading}</p>
          </main>
        }
      >
        <Outlet />
      </Suspense>
      <footer className="wrap site-footer">
        <Link to="/backup">{strings.backupLink}</Link>
        <Link to="/packs">{strings.packsLink}</Link>
      </footer>
      <ScrollRestoration />
    </>
  )
}

/**
 * Shown on every page when this browser holds progress saved by a newer
 * version of the app (this page is an old copy of it). The progress store
 * leaves that progress untouched; a reload brings the app that can read it.
 */
function NewerVersionNotice() {
  const { strings } = useLanguage()
  return (
    <div className="wrap notice">
      <section role="alert" className="panel message">
        <p>{strings.savedByNewerVersion}</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          {strings.reload}
        </button>
      </section>
    </div>
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
