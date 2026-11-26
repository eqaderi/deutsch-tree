import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { useLanguage } from '../language/index.tsx'

/** The title of the browser tab for a page: the page's own title, then the app's name. */
export function PageTitle({ title }: { title: string }) {
  const { strings } = useLanguage()
  return <title>{`${title} · ${strings.appName}`}</title>
}

/** The link back at the top of a page. Its arrow points the other way on a right-to-left page. */
export function BackLink({ to, relative, children }: Pick<LinkProps, 'to' | 'relative'> & { children: ReactNode }) {
  return (
    <Link to={to} relative={relative} className="back">
      <span className="flip" aria-hidden="true">
        ←
      </span>
      {children}
    </Link>
  )
}
