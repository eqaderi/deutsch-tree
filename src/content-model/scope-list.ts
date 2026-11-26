/**
 * The vocabulary scope list: every word the learner has to know, one per
 * line, in `content/vocabulary/scope-list.tsv`. The vocabulary nodes together
 * must hold each of its words exactly once.
 *
 * The file is written by `pnpm vocabulary:scope` (src/vocabulary-scope), never
 * by hand. It holds headwords only: nothing here is a sentence, a definition
 * or a translation from a word list.
 */

/** Where the scope list lies, inside the content folder. */
export const SCOPE_LIST_FILE = 'vocabulary/scope-list.tsv'

export const WORD_CLASSES = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'article',
  'preposition',
  'conjunction',
  'numeral',
  'particle',
  'interjection',
  'phrase',
  'abbreviation',
  /** A word-building part such as "Lieblings-". In the scope list only when the scope rule includes them. */
  'affix',
] as const
export type WordClass = (typeof WORD_CLASSES)[number]

export interface ScopeWord {
  /** The headword, without article. It names the word everywhere: no two lines share it. */
  word: string
  class: WordClass
  /** The lowest level whose word list has the word: A1, A2 or B1. */
  level: string
  /** For a noun: der, die or das; `der/die` when the lists print two. Empty when unknown. */
  article: string
  /** For a noun: the plural marker as the lists print it (`-n`, `¨-e`, `Museen`), `sg` or `pl` for a noun with one number only. */
  plural: string
  /** For a verb: `sich` when it is always reflexive, `(sich)` when it can be. */
  reflexive: string
  /** The feminine form that is learned with this word instead of being a word of its own. */
  feminine: string
  /** Words for the same thing in Austria (A) or Switzerland (CH), such as `Marille (A)`. */
  regional: string
}

/** The columns of the file, in order. A line ends after its last filled column. */
export const SCOPE_LIST_COLUMNS = [
  'word',
  'class',
  'level',
  'article',
  'plural',
  'reflexive',
  'feminine',
  'regional',
] as const satisfies ReadonlyArray<keyof ScopeWord>

export interface ScopeListProblem {
  /** Line number in the file, counted from 1; the header is line 1. */
  line: number
  message: string
}

/** The words of a scope list file, each with its line number, and what is wrong with the file. */
export function parseScopeList(text: string): {
  words: Array<ScopeWord & { line: number }>
  problems: ScopeListProblem[]
} {
  const words: Array<ScopeWord & { line: number }> = []
  const problems: ScopeListProblem[] = []
  const lines = text.split('\n')

  if (lines[0] !== SCOPE_LIST_COLUMNS.join('\t')) {
    problems.push({ line: 1, message: `the first line must name the columns: ${SCOPE_LIST_COLUMNS.join(', ')}` })
    return { words, problems }
  }

  const seen = new Map<string, number>()
  lines.forEach((text, index) => {
    const line = index + 1
    if (index === 0 || text === '') return
    const cells = text.split('\t')
    const entry = Object.fromEntries(SCOPE_LIST_COLUMNS.map((column, at) => [column, cells[at] ?? ''])) as Record<
      keyof ScopeWord,
      string
    >

    if (cells.length > SCOPE_LIST_COLUMNS.length) {
      problems.push({ line, message: `has ${cells.length} columns; a line has at most ${SCOPE_LIST_COLUMNS.length}` })
    } else if (entry.word === '') {
      problems.push({ line, message: 'has no word' })
    } else if (!(WORD_CLASSES as readonly string[]).includes(entry.class)) {
      problems.push({ line, message: `"${entry.class}" is not a word class (${WORD_CLASSES.join(', ')})` })
    } else if (!/^[A-C][12]$/.test(entry.level)) {
      problems.push({ line, message: `"${entry.level}" is not a level such as A1, A2 or B1` })
    } else if (seen.has(entry.word)) {
      problems.push({ line, message: `the word "${entry.word}" is also on line ${seen.get(entry.word)}` })
    } else {
      seen.set(entry.word, line)
      words.push({ ...(entry as ScopeWord), line })
    }
  })

  return { words, problems }
}

/** The text of a scope list file. */
export function formatScopeList(words: readonly ScopeWord[]): string {
  const lines = words.map((word) =>
    SCOPE_LIST_COLUMNS.map((column) => word[column])
      .join('\t')
      .replace(/\t+$/, ''),
  )
  return `${[SCOPE_LIST_COLUMNS.join('\t'), ...lines].join('\n')}\n`
}
