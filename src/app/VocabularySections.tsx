import {
  asLearned,
  type HeardWord,
  pluralAsLearned,
  type VocabularyContent,
  type VocabularyWord,
} from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { AnkiExport } from './AnkiExport.tsx'
import { German } from './German.tsx'
import { PlayButton, SpokenExample } from './PlayButton.tsx'

/**
 * The page of a vocabulary node: one panel with every word of the node, in
 * the order of the node file, then the export of the words to Anki. The test
 * follows, as on every page.
 */
export function VocabularySections({ nodeId, content }: { nodeId: string; content: VocabularyContent }) {
  const { strings } = useLanguage()
  return (
    <>
      <section className="panel" aria-labelledby="section-words">
        <h2 id="section-words" className="cap">
          {strings.words}
        </h2>
        <ul className="words" aria-labelledby="section-words">
          {content.words.map((word) => (
            <WordEntry key={word.word} word={word} />
          ))}
        </ul>
      </section>
      <AnkiExport nodeId={nodeId} words={content.words} />
    </>
  )
}

/**
 * One word: the word as it is learned (a noun with its article), its plural,
 * word class and level; what it means; and its example sentence.
 *
 * A learner who reads in English or Persian sees the meaning in their
 * language and then the German definition; a learner who reads in German
 * sees the definition alone, and no translation of the example.
 */
function WordEntry({ word }: { word: HeardWord }) {
  const { language, strings } = useLanguage()
  return (
    <li className="vocabulary-word">
      <div className="word-head">
        <span className="word-said">
          {/* The word is heard as it is learned, a noun with its article. */}
          <PlayButton audio={word.audio} />
          <German className="word-german">{asLearned(word)}</German>
        </span>
        <span className="word-facts">
          <span className="word-class">{strings.wordClasses[word.class]}</span>
          <span className="tag">{word.level}</span>
        </span>
      </div>
      {word.class === 'noun' && <Plural word={word} />}
      {language !== 'de' && (
        <p className="word-meaning">
          <bdi>{word.meaning[language]}</bdi>
        </p>
      )}
      <p className="word-definition">
        <German>{word.definition}</German>
      </p>
      <p className="example heard word-example">
        <SpokenExample example={word.example} />
      </p>
    </li>
  )
}

function Plural({ word }: { word: VocabularyWord }) {
  const { strings } = useLanguage()
  const plural = pluralAsLearned(word)
  return (
    <p className="word-plural">
      <span className="secondary">{strings.plural}</span>{' '}
      {plural ? (
        <German>{plural}</German>
      ) : (
        <span>{word.number === 'plural-only' ? strings.pluralOnly : strings.noPlural}</span>
      )}
    </p>
  )
}
