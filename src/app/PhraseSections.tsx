import { use, useId } from 'react'
import { Link } from 'react-router'
import type { NodeSummary, Phrase, PhrasesContent } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { loadIndex } from './content.ts'
import { German, RichText } from './German.tsx'
import { Panel } from './Panel.tsx'
import { SpokenExample } from './PlayButton.tsx'

/**
 * The panels of a phrases page: what the phrases are for, then the phrases.
 * Each phrase is one inner card: the phrase, its meaning, an example in use
 * and the exam tasks it serves.
 */
export function PhraseSections({ node, content }: { node: NodeSummary; content: PhrasesContent }) {
  const { language, strings } = useLanguage()
  return (
    <>
      {node.purpose && (
        <Panel id="section-purpose" heading={strings.phrasesPurpose}>
          <p className="rule">
            <RichText parts={node.purpose[language]} />
          </p>
        </Panel>
      )}

      <Panel id="section-phrases" heading={strings.phraseList}>
        <ul className="phrases" aria-labelledby="section-phrases">
          {content.phrases.map((phrase, index) => (
            <li key={index} className="phrase">
              <PhraseCard phrase={phrase} />
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}

function PhraseCard({ phrase }: { phrase: Phrase }) {
  const { language, strings } = useLanguage()
  const id = useId()
  // An exam task is named by the id of its exam-part node; the content pipeline checks that the node exists.
  const { nodes } = use(loadIndex())
  const tasks = phrase.examTasks.flatMap((task) => nodes.find((candidate) => candidate.id === task) ?? [])
  return (
    <>
      <h3 className="phrase-de">
        <German>{phrase.de}</German>
      </h3>
      <p className="phrase-meaning">
        <RichText parts={phrase.meaning[language]} />
      </p>

      <p className="phrase-label">{strings.phraseExample}</p>
      <p className="example heard">
        <SpokenExample example={phrase.example} />
      </p>

      <p id={id} className="phrase-label">
        {strings.phraseUsefulFor}
      </p>
      <ul className="phrase-tasks" aria-labelledby={id}>
        {tasks.map((task) => (
          <li key={task.id}>
            <Link to={`/node/${task.id}`} className="phrase-task">
              {/* One box for the whole name: as boxes of their own, its German parts would lose the spaces around them. */}
              <span>
                <RichText parts={task.title[language]} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
