import { asLearned, pluralAsLearned, type VocabularyContent, type VocabularyWord } from '../content-model/index.ts'
import { useLanguage } from '../language/index.tsx'
import { German } from './German.tsx'

/**
 * The page of a vocabulary node: one panel with every word of the node, in
 * the order of the node file. The test follows, as on every page.
 */
export function VocabularySections({ content }: { content: VocabularyContent }) {
  const { strings } = useLanguage()
  return (
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
function WordEntry({ word }: { word: VocabularyWord }) {
  const { language, strings } = useLanguage()
  return (
    <li className="word">
      <div className="word-head">
        {/* The place for the button that reads the word aloud with its article (audio, ticket #14). */}
        <German className="word-german">{asLearned(word)}</German>
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
      <p className="example word-example">
        <German>{word.example.de}</German>
        {/* A learner reading in German needs no translation. */}
        {language !== 'de' && <small>{word.example[language]}</small>}
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
