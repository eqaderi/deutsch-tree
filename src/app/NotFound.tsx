import type { NodeSummary } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { BackLink, PageTitle } from './PageTitle.tsx'
import { lastTreeAddress, treeAddress, treeAddressOf } from './treeAddress.ts'

export function NotFound() {
  const { strings } = useLanguage()
  return (
    <main className="wrap">
      <PageTitle title={strings.notFoundTitle} />
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
 * the learner sees the topic they come from; from a page of a level (its
 * checkpoint), to that level; from any other page, to the tree as they last
 * saw it.
 */
export function BackToTree({ from, level }: { from?: Pick<NodeSummary, 'level' | 'kind'>; level?: string }) {
  const { strings } = useLanguage()
  const to = from ? treeAddressOf(from) : level !== undefined ? treeAddress({ level }) : lastTreeAddress()
  return <BackLink to={to}>{strings.allTopics}</BackLink>
}
