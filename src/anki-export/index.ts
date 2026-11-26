/**
 * Vocabulary as a file that Anki imports: words in, the text of the file out.
 * Pure functions; the app hands the text to the browser to save, and nothing
 * is uploaded.
 *
 * The format is Anki's plain-text import with file headers, which Anki 2.1.54
 * and newer read (https://docs.ankiweb.net/importing/text-files.html):
 *
 * - Tab-separated, UTF-8, one note per line. A field that holds a tab or a
 *   double quote is put in double quotes, and a quote inside it is doubled.
 * - `#html:true`: the fields are HTML, so `&`, `<` and `>` in the content are
 *   written as entities, and the lines of the back are joined with `<br>`.
 * - `#notetype:Basic`: the note type that every new collection has, with the
 *   fields Front and Back. There is no `#columns` header on purpose: with
 *   column names Anki maps columns to fields by name, and a collection made
 *   in another interface language names the fields of Basic otherwise. Without
 *   them it maps by position, so column 1 goes to the first field and column 2
 *   to the second of whichever note type is chosen.
 * - `#deck column`: every card goes to the deck `deutsch-tree`, which Anki
 *   makes when it does not exist yet.
 * - `#guid column`: every note has an id made from its word. An updated file
 *   imported again updates the notes with that id instead of adding them a
 *   second time, and Anki then leaves out its first-field comparison, so a card
 *   the learner wrote for the same word is never changed by the import.
 * - `#tags:deutsch-tree`: a tag added to every note. A tag the learner gave a
 *   note stays on an update.
 */
import { asLearned, type Language, type VocabularyWord } from '../content-model/index.ts'

/** The deck the cards go to, the tag they get, and the start of every note id and file name. */
const NAME = 'deutsch-tree'

const DECK_COLUMN = 3
const GUID_COLUMN = 4

const HEADERS = [
  '#separator:tab',
  '#html:true',
  '#notetype:Basic',
  `#deck column:${DECK_COLUMN}`,
  `#guid column:${GUID_COLUMN}`,
  `#tags:${NAME}`,
]

/**
 * The file for these words, with the meaning in `language`. One note per word:
 * in front the word as it is learned (a noun with its article), on the back
 * its meaning and its example sentence with the translation. A learner who
 * reads in German has no translation: the back is the German definition and
 * the example alone.
 */
export function ankiText(words: readonly VocabularyWord[], language: Language): string {
  const notes = words.map((word) =>
    [asLearned(word), back(word, language), NAME, noteId(word)].map(field).join('\t'),
  )
  return `${[...HEADERS, ...notes].join('\n')}\n`
}

/** The name of the file of one node (its id), or of every node the learner has started (`started`). */
export function ankiFileName(of: string): string {
  return `${NAME}-anki-${of}.txt`
}

/** A word belongs to exactly one node, so the word alone is its note's id, and the id stays when the word moves. */
function noteId(word: VocabularyWord): string {
  return `${NAME}:${word.word}`
}

function back(word: VocabularyWord, language: Language): string {
  const example = html(word.example.de)
  if (language === 'de') return `${html(word.definition)}<br><br>${example}`
  const own = (text: string) => (language === 'fa' ? `<span dir="rtl">${html(text)}</span>` : html(text))
  return `${own(word.meaning[language])}<br><br>${example}<br>${own(word.example[language])}`
}

/** Text as HTML: the three characters that HTML reads, as entities, and a line break as `<br>`. */
function html(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')
}

/** A field as Anki reads it: in double quotes, with each quote doubled, when it holds a tab, a quote or a line break. */
function field(text: string): string {
  return /["\t\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
