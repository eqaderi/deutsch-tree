import { NavLink } from 'react-router'
import { useLanguage } from '../language/index.tsx'

/**
 * The way to the two reference pages, on every page: search, and all
 * grammar at a glance.
 */
export function ReferenceLinks() {
  const { strings } = useLanguage()
  return (
    <nav className="reference-links" aria-label={strings.reference}>
      <NavLink to="/search">
        <span>{strings.search}</span>
      </NavLink>
      <NavLink to="/overview">
        <span>{strings.allGrammar}</span>
      </NavLink>
    </nav>
  )
}
