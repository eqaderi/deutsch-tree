import { Link } from 'react-router'
import type { NodeSummary } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { lastTreeAddress, treeAddressOf } from './treeAddress.ts'

export function NotFound() {
  const { strings } = useLanguage()
  return (
    <main className="wrap">
      <title>{`${strings.notFoundTitle} · ${strings.appName}`}</title>
      <BackToTree />
      <header className="page-head">
        <h1>{strings.notFoundTitle}</h1>
      </header>
      <section className="panel message">
        <p>{strings.notFoundText}</p>
      </section>
    </main>
  )
}

/**
 * The link back to the tree. From a topic it leads to the topic's level, so
 * the learner sees the topic they come from; from any other page, to the tree
 * as they last saw it.
 */
export function BackToTree({ from }: { from?: Pick<NodeSummary, 'level' | 'kind'> }) {
  const { strings } = useLanguage()
  return (
    <Link to={from ? treeAddressOf(from) : lastTreeAddress()} className="back">
      <span className="flip" aria-hidden="true">
        ←
      </span>
      {strings.allTopics}
    </Link>
  )
}
