import { type ReactNode, use } from 'react'
import { Link, useParams } from 'react-router'
import type { GrammarContent, NodeSummary } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { isDone } from '../learning-engine/index.ts'
import { loadIndex, loadNode } from './content.ts'
import { ExamPartSections } from './ExamPartSections.tsx'
import { German, plainText, RichText } from './German.tsx'
import { KindLabel } from './KindLabel.tsx'
import { BackToTree, NotFound } from './NotFound.tsx'
import { Panel } from './Panel.tsx'
import { useProgress } from './progress.ts'

/**
 * A node's page: a column of panels in one fixed order, with the main action
 * at the bottom of the screen. A grammar page is rule, table, examples,
 * common mistakes, test. An exam-part page is what the part asks, how it is
 * scored, how to approach it, practice task.
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
  const isExamPart = content.kind === 'exam-part'
  return (
    <NodeFrame node={summary}>
      {isExamPart ? <ExamPartSections content={content} /> : <GrammarSections content={content} />}
      <section className="action-bar" aria-labelledby="section-test">
        <h2 id="section-test" className="visually-hidden">
          {isExamPart ? strings.practice : strings.test}
        </h2>
        <Link to="test" relative="path" className="btn btn-main">
          {isExamPart ? strings.startPractice : strings.takeTheTest}
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
      <BackToTree />
      <header className="page-head">
        <h1>
          <RichText parts={node.title[language]} />
        </h1>
        <div className="meta">
          <span className="tag">{node.level}</span>
          <KindLabel kind={node.kind} />
          {node.exam && (
            <>
              <span className="tag">{strings.examModules[node.exam.module]}</span>
              <span className="tag">{strings.examPartNumber(node.exam.part)}</span>
            </>
          )}
          {node.status === 'coming-soon' && <span className="tag">{strings.comingSoon}</span>}
          {done && <span className="tag tag-done">{strings.done}</span>}
        </div>
      </header>
      {children}
    </main>
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
