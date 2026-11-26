import { useId } from 'react'
import { Link } from 'react-router'
import type { NodeSummary } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { type NodeState, nodeState } from '../learning-engine/index.ts'
import { RichText } from './German.tsx'
import { useProgress } from './progress.ts'

/** The circle that supports a state word: empty ring, half-filled ring, or a dark circle with a tick. */
export function StateMark({ state }: { state: NodeState | 'coming-soon' }) {
  return <span className={`mark mark-${state}`} aria-hidden="true" />
}

/**
 * One topic in a list: its state as a mark and a word, a link to its page
 * and, beside it, a link straight to its test. A topic that is not written
 * yet is shown, but leads nowhere.
 *
 * `isNext` marks the next recommended topic: the one place in a list where
 * the accent colour is used.
 */
export function NodeRow({ node, isNext = false }: { node: NodeSummary; isNext?: boolean }) {
  const { language, strings } = useLanguage()
  const state = nodeState(useProgress(), node.id)
  const titleId = useId()
  const title = (
    <span className="row-title" id={titleId}>
      <RichText parts={node.title[language]} />
    </span>
  )

  if (node.status === 'coming-soon') {
    return (
      <div className="row row-soon">
        <StateMark state="coming-soon" />
        <span className="row-text">
          {title}
          <span className="row-state">{strings.comingSoon}</span>
        </span>
      </div>
    )
  }
  return (
    <div className={isNext ? 'row row-next' : 'row'}>
      <Link to={`/node/${node.id}`} className="row-main">
        <StateMark state={state} />
        <span className="row-text">
          {title}
          <span className="row-meta">
            {state === 'done' ? (
              <span className="row-state">{strings.done}</span>
            ) : (
              <span className={isNext ? 'pill pill-next' : 'pill'}>
                {state === 'in-progress' ? strings.continueTopic : strings.start}
              </span>
            )}
            {isNext && <span className="row-next-word">{strings.yourNextTopic}</span>}
          </span>
        </span>
      </Link>
      {node.hasTest && (
        // Every row's link says "Test"; the title it belongs to is its description.
        <Link to={`/node/${node.id}/test`} className="row-test" aria-describedby={titleId}>
          {strings.test}
        </Link>
      )}
    </div>
  )
}
