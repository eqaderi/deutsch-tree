import { use } from 'react'
import { Link, useParams } from 'react-router'
import { useLanguage } from '../language/index.tsx'
import { loadNode } from './content.ts'
import { plainText } from './German.tsx'
import { isNodeId } from './NodePage.tsx'
import { NotFound } from './NotFound.tsx'

/**
 * Where a node's test will run. For now it only says how many questions the
 * node's pool holds; taking the test is not built yet.
 */
export function TestPage() {
  const { id = '' } = useParams()
  const { language, strings } = useLanguage()
  if (!isNodeId(id)) return <NotFound />

  const node = use(loadNode(id))
  if (!node.content) return <NotFound />

  const count = node.content.questions.length
  return (
    <main className="wrap">
      <title>{`${strings.testTitle(plainText(node.title[language]))} · ${strings.appName}`}</title>
      <Link to=".." relative="path" className="back">
        <span className="flip" aria-hidden="true">
          ←
        </span>
        {strings.backToTopic}
      </Link>
      <header className="page-head">
        <h1>{strings.testTitle(plainText(node.title[language]))}</h1>
      </header>
      <section className="panel message">
        <p>
          <span className="big-number">{strings.number(count)}</span>{' '}
          <span className="secondary">{strings.questionsInPool(count)}</span>
        </p>
        <p>{strings.testNotReady}</p>
      </section>
    </main>
  )
}
