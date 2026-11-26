import { type ReactNode, use, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { GrammarContent, NodeSummary } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { isDone, unmarkDone } from '../learning-engine/index.ts'
import { loadIndex, loadNode } from './content.ts'
import { German, plainText, RichText } from './German.tsx'
import { KindLabel } from './KindLabel.tsx'
import { BackToTree, NotFound } from './NotFound.tsx'
import { updateProgress, useProgress } from './progress.ts'

/**
 * A node's page. A grammar page is a column of panels in one fixed order:
 * rule, table, examples, common mistakes, test.
 */
export function NodePage() {
  const { id = '' } = useParams()
  const { strings } = useLanguage()

  // Ask for the page content straight away, not after the index has arrived.
  const nodeRequest = isNodeId(id) ? loadNode(id) : null
  const summary = use(loadIndex()).nodes.find((node) => node.id === id)
  if (!summary || !nodeRequest) return <NotFound />

  if (summary.status === 'coming-soon') {
    return (
      <NodeFrame node={summary}>
        <section className="panel message">
          <p>{strings.comingSoonPage}</p>
        </section>
      </NodeFrame>
    )
  }

  const { content } = use(nodeRequest)
  if (!content) return <NotFound />
  return (
    <NodeFrame node={summary}>
      <GrammarSections content={content} />
      <section className="action-bar" aria-labelledby="section-test">
        <h2 id="section-test" className="visually-hidden">
          {strings.test}
        </h2>
        <Link to="test" relative="path" className="btn btn-main">
          {strings.takeTheTest}
        </Link>
      </section>
    </NodeFrame>
  )
}

export function isNodeId(id: string): boolean {
  return /^[a-z0-9-]+$/.test(id)
}

function NodeFrame({ node, children }: { node: NodeSummary; children: ReactNode }) {
  const { language, strings } = useLanguage()
  const done = isDone(useProgress(), node.id)
  return (
    <main className="wrap">
      <title>{`${plainText(node.title[language])} · ${strings.appName}`}</title>
      <BackToTree from={node} />
      <header className="page-head">
        <h1>
          <RichText parts={node.title[language]} />
        </h1>
        <div className="meta">
          <span className="tag">{node.level}</span>
          <KindLabel kind={node.kind} />
          {node.status === 'coming-soon' && <span className="tag">{strings.comingSoon}</span>}
          {done && <span className="tag tag-done">{strings.done}</span>}
        </div>
        <Unmark key={node.id} nodeId={node.id} />
        <BuildsOn node={node} />
      </header>
      {children}
    </main>
  )
}

/**
 * Un-marks a done node, for a learner who has forgotten the topic. It asks
 * once before it does: the only way back to "done" is to pass again.
 */
function Unmark({ nodeId }: { nodeId: string }) {
  const { strings } = useLanguage()
  const done = isDone(useProgress(), nodeId)
  const [step, setStep] = useState<'offered' | 'asking' | 'unmarked'>('offered')
  return (
    <div className="unmark">
      {done && step !== 'asking' && (
        <button type="button" className="text-button" onClick={() => setStep('asking')}>
          {strings.unmark}
        </button>
      )}
      {done && step === 'asking' && (
        <div className="unmark-question">
          <p>{strings.unmarkQuestion}</p>
          <div className="unmark-actions">
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                updateProgress((progress) => unmarkDone(progress, nodeId))
                setStep('unmarked')
              }}
            >
              {strings.unmarkConfirm}
            </button>
            <button type="button" className="btn btn-quiet btn-small" onClick={() => setStep('offered')}>
              {strings.keepDone}
            </button>
          </div>
        </div>
      )}
      {/* Always there, so that a screen reader hears the words when they arrive. */}
      <p role="status">{!done && step === 'unmarked' ? strings.unmarked : ''}</p>
    </div>
  )
}

/**
 * The nodes this one builds on, as links. They are advice on what to review:
 * nothing here, or anywhere, locks a node.
 */
function BuildsOn({ node }: { node: NodeSummary }) {
  const { language, strings } = useLanguage()
  const { nodes } = use(loadIndex())
  const progress = useProgress()
  const earlier = node.prerequisites.flatMap((id) => nodes.find((candidate) => candidate.id === id) ?? [])
  if (earlier.length === 0) return null
  return (
    <section className="builds-on" aria-labelledby="builds-on-heading">
      <h2 id="builds-on-heading" className="cap">
        {strings.buildsOn}
      </h2>
      <ul>
        {earlier.map((other) => (
          <li key={other.id}>
            <Link to={`/node/${other.id}`}>
              <RichText parts={other.title[language]} />
            </Link>
            {other.status === 'coming-soon' ? (
              <span className="tag">{strings.comingSoon}</span>
            ) : (
              isDone(progress, other.id) && <span className="tag tag-done">{strings.done}</span>
            )}
          </li>
        ))}
      </ul>
      <p>{strings.buildsOnNote}</p>
    </section>
  )
}

function GrammarSections({ content }: { content: GrammarContent }) {
  const { language, strings } = useLanguage()
  return (
    <>
      <Panel id="section-rule" heading={strings.rule}>
        <p className="rule">
          <RichText parts={content.explanations[language].rule} />
        </p>
      </Panel>

      <Panel id="section-table" heading={strings.table}>
        <div className="table-scroll">
          {/* The rows are German, so the table reads left to right in every language. */}
          <table dir="ltr">
            <thead>
              <tr>
                {content.table.columns.map((column, index) => (
                  <th key={index} scope="col">
                    <bdi>{column[language]}</bdi>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      <German>{cell}</German>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel id="section-examples" heading={strings.examples}>
        <ul className="examples">
          {content.examples.map((example, index) => (
            <li key={index} className="example">
              <German>{example.de}</German>
              {/* A learner reading in German needs no translation. */}
              {language !== 'de' && <small>{example[language]}</small>}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="section-mistakes" heading={strings.commonMistakes}>
        <ul className="mistakes">
          {content.mistakes.map((mistake, index) => (
            <li key={index} className="mistake">
              <div className="mistake-line mistake-wrong">
                <span className="mistake-word">{strings.wrong}</span>
                <German>{mistake.wrong}</German>
              </div>
              <div className="mistake-line mistake-right">
                <span className="mistake-word">{strings.right}</span>
                <German>{mistake.right}</German>
              </div>
              <p>
                <RichText parts={mistake.why[language]} />
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}

function Panel({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="cap">
        {heading}
      </h2>
      {children}
    </section>
  )
}
