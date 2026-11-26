/**
 * Vocabulary scope: which words of the Goethe A1, A2 and B1 word lists the
 * learner has to know. The extracted lists in, the scope list out.
 *
 * The lists themselves stay outside the repository. `buildScopeList` reads
 * their headword tables, applies the corrections in
 * `content/vocabulary/scope-corrections.yaml` and then `SCOPE_RULE`, and
 * returns the scope list (`content/vocabulary/scope-list.tsv`) and the words
 * it left out. `cli.ts` is the command: `pnpm vocabulary:scope`.
 *
 * Only headwords pass through here: a word, its article, plural marker, word
 * class and level. No sentence, definition or translation of a word list is
 * read or written.
 */
import { z } from 'zod'
import { type ScopeWord, WORD_CLASSES, type WordClass } from '../content-model/scope-list.ts'

// ---------------------------------------------------------------------------
// The scope rule
// ---------------------------------------------------------------------------

/**
 * What counts as "a word in scope". Each line is one decision; changing one
 * and running `pnpm vocabulary:scope` again gives the scope list of the other
 * answer. The content check then names every word that has to be given to a
 * vocabulary node, or taken out of one.
 */
export interface ScopeRule {
  /**
   * Word-building parts that are not words: "Lieblings-", "un-", "-weise".
   * `leave-out` drops them; grammar teaches word building.
   */
  affixes: 'leave-out' | 'include'
  /**
   * Feminine forms that the lists print beside the masculine noun: "Ärztin"
   * beside "Arzt". `note-on-base` writes the form in the `feminine` column of
   * the masculine noun instead of counting it as a word of its own.
   */
  feminineForms: 'note-on-base' | 'include'
  /**
   * Words that the B1 list marks for Austria or Switzerland only: "Marille",
   * "Velo". `note-on-base` writes the word in the `regional` column of the
   * word used in Germany, when the list names one, and leaves it out
   * otherwise.
   */
  regionalVariants: 'note-on-base' | 'include'
  /**
   * The lists' word groups (numbers, months, colours, countries, school
   * subjects …), which stand before the alphabetical lists.
   */
  wordGroups: 'include' | 'leave-out'
}

/**
 * THE SCOPE RULE IN FORCE. Everything in the three lists, without
 * word-building parts, with feminine forms and Austrian or Swiss variants
 * noted on their base word. Waiting for the learner's approval:
 * docs/approvals/vocabulary-themes.md.
 */
export const SCOPE_RULE: ScopeRule = {
  affixes: 'leave-out',
  feminineForms: 'note-on-base',
  regionalVariants: 'note-on-base',
  wordGroups: 'include',
}

// ---------------------------------------------------------------------------
// Corrections to the extracted lists
// ---------------------------------------------------------------------------

/** One change to a headword of the extracted lists. `word` is the headword as the lists spell it. */
export interface Change {
  word: string
  /** Why, in a few words. Shown to nobody; it is for the next maintainer. */
  reason?: string
  /** The headword to use instead: "andere" for "ander-". */
  rename?: string
  class?: WordClass
  article?: string
  plural?: string
  reflexive?: string
  /** This row is another spelling of that headword: drop the row, and give that word the lower level of the two. */
  sameAs?: string
  /** This row is no word at all (a duplicate the merge did not see, a piece of notation). */
  drop?: true
  /** True: a real word although written with a hyphen. False: a word-building part although written without. */
  isWord?: boolean
  /** The masculine noun this is the feminine form of; `null` when it is a word of its own. */
  feminineOf?: string | null
  /** The word used in Germany that this Austrian or Swiss word stands for; `null` when the word is used in Germany too. */
  variantOf?: string | null
  /** With `variantOf`: where the word is used ("A", "CH"), when the lists print no region for it. */
  region?: string
}

/** A headword that the extraction lost, for example one printed in the cell of another word. */
export interface Addition {
  word: string
  class: WordClass
  level: string
  article?: string
  plural?: string
  reason?: string
}

export interface Corrections {
  /** The word class of every word that is neither noun nor verb: the lists print none. */
  classes: Partial<Record<WordClass, string[]>>
  changes: Change[]
  additions?: Addition[]
}

// ---------------------------------------------------------------------------
// Building the scope list
// ---------------------------------------------------------------------------

/** A row of a headword table, by column name. */
type Row = Record<string, string>

export type LeftOutReason = 'affix' | 'feminine form' | 'regional variant' | 'word group' | 'same word' | 'no word'

export interface LeftOut {
  /** The headword as the lists spell it. */
  word: string
  level: string
  reason: LeftOutReason
  /** The scope word that carries it in its `feminine` or `regional` column, or that it is another spelling of. */
  notedOn: string
}

export interface ScopeListResult {
  /** The scope list, in dictionary order. */
  words: ScopeWord[]
  /** Every headword of the lists that is not a line of the scope list, and why. */
  leftOut: LeftOut[]
}

interface Candidate extends Omit<ScopeWord, 'class'> {
  /** The headword as the lists spell it. */
  listed: string
  /** Undefined until the corrections name it: the lists only tell nouns and verbs apart. */
  class: WordClass | undefined
  isAffix: boolean
  /** The masculine noun this is the feminine form of. */
  feminineOf: string | undefined
  /** The regions the B1 list marks the word for, when Germany is not among them: "A" or "A, CH". */
  regions: string | undefined
  /** The word used in Germany, when a correction names it. */
  variantOf: string | undefined
  /** The B1 list's cross-references to the words of other regions. */
  xref: string
  inWordGroupOnly: boolean
  sameAs: string | undefined
  dropped: boolean
}

/** Throws an `Error` that says what to repair when the lists and the corrections do not fit together. */
export function buildScopeList(input: {
  /** The rows of `union-headwords.tsv`. */
  merged: Row[]
  /** The rows of `b1-headwords.tsv`: the only list with region marks. */
  b1: Row[]
  corrections: Corrections
  rule: ScopeRule
}): ScopeListResult {
  const { rule, corrections } = input
  const candidates = input.merged.map((row) => candidateOf(row, input.b1))
  applyChanges(candidates, corrections.changes)
  for (const addition of corrections.additions ?? []) candidates.push(addedCandidate(addition))

  const byListed = new Map(candidates.map((candidate) => [candidate.listed, candidate]))
  const leftOut: LeftOut[] = []
  const leave = (candidate: Candidate, reason: LeftOutReason, notedOn = '') =>
    leftOut.push({ word: candidate.listed, level: candidate.level, reason, notedOn })

  // Spellings of one word, and rows that are no word.
  for (const candidate of candidates) {
    if (candidate.sameAs === undefined) continue
    const target = byListed.get(candidate.sameAs)
    if (target === undefined) {
      throw new Error(`"${candidate.listed}" is the same as "${candidate.sameAs}", which the lists do not have`)
    }
    const level = candidate.level
    if (level < target.level) target.level = level
    leave(candidate, 'same word', target.word)
  }
  for (const candidate of candidates) if (candidate.dropped) leave(candidate, 'no word')

  // The scope rule.
  const kept: Candidate[] = []
  const notes: Array<{ candidate: Candidate; reason: 'feminine form' | 'regional variant' }> = []
  for (const candidate of candidates) {
    if (candidate.sameAs !== undefined || candidate.dropped) continue
    if (candidate.isAffix && rule.affixes === 'leave-out') leave(candidate, 'affix')
    else if (candidate.inWordGroupOnly && rule.wordGroups === 'leave-out') leave(candidate, 'word group')
    else if (candidate.regions !== undefined && rule.regionalVariants === 'note-on-base')
      notes.push({ candidate, reason: 'regional variant' })
    else if (candidate.feminineOf !== undefined && rule.feminineForms === 'note-on-base')
      notes.push({ candidate, reason: 'feminine form' })
    else kept.push(candidate)
  }

  const byWord = new Map<string, Candidate>()
  for (const candidate of kept) {
    if (byWord.has(candidate.word)) {
      throw new Error(`two headwords are spelled "${candidate.word}"; rename one or mark it as the same word`)
    }
    byWord.set(candidate.word, candidate)
  }

  // A word that was left out is noted on its base word, when that is a word of the scope list.
  for (const { candidate, reason } of notes) {
    const feminineOf = candidate.feminineOf ?? ''
    const base =
      reason === 'feminine form'
        ? byWord.get(byListed.get(feminineOf)?.word ?? feminineOf)
        : baseOfVariant(candidate, kept, byWord)
    if (base !== undefined) {
      const column = reason === 'feminine form' ? 'feminine' : 'regional'
      const note = reason === 'feminine form' ? candidate.word : `${candidate.word} (${candidate.regions})`
      if (!base[column].split(', ').includes(note)) base[column] = [base[column], note].filter(Boolean).join(', ')
    }
    leave(candidate, reason, base?.word ?? '')
  }

  // Word classes: the lists print none.
  const classOf = new Map<string, WordClass>()
  for (const wordClass of WORD_CLASSES) {
    for (const word of corrections.classes[wordClass] ?? []) classOf.set(word, wordClass)
  }
  const withoutClass: string[] = []
  const words = kept.map((candidate): ScopeWord => {
    const wordClass = candidate.isAffix ? 'affix' : (candidate.class ?? classOf.get(candidate.word))
    if (wordClass === undefined) withoutClass.push(candidate.word)
    const { word, level, article, plural, reflexive, feminine, regional } = candidate
    return { word, class: wordClass ?? 'phrase', level, article, plural, reflexive, feminine, regional }
  })
  if (withoutClass.length > 0) {
    throw new Error(`no word class for: ${withoutClass.sort().join(', ')}. Add each to "classes" in the corrections.`)
  }

  return { words: words.sort(inAlphabet), leftOut: leftOut.sort(inAlphabet) }
}

function candidateOf(row: Row, b1: Row[]): Candidate {
  const lemma = row.lemma ?? ''
  const isNoun = row.pos === 'noun'
  const inB1 = b1.filter((other) => other.lemma === lemma && (other.pos === 'noun') === isNoun)
  // Only the B1 list marks regions, and the A1 and A2 lists use the standard of Germany: a word is
  // regional when it stands in the B1 list alone, and there every time with a region that is not Germany.
  const regions = inB1.map((mark) => (mark.region ?? '').split(/[,; ]+/).filter(Boolean))
  const regionalOnly =
    row.in_lists === 'b1' && regions.length > 0 && regions.every((list) => list.length > 0 && !list.includes('D'))
  return {
    listed: lemma,
    word: lemma,
    class: isNoun ? 'noun' : row.pos === 'verb' ? 'verb' : undefined,
    level: (row.level ?? '').toUpperCase(),
    // The merged list joins what several rows print with "; ": the two genders of one headword.
    article: [...new Set((row.article ?? '').split(/; |\//).filter(Boolean))].join('/'),
    plural: row.plural || row.number || '',
    reflexive: row.reflexive ?? '',
    // "Fahrerin, -nen" in the cell of "Fahrer": the lists print some feminine forms beside the masculine noun.
    feminine: /^(\p{Lu}\p{L}+in), -nen$/u.exec(row.alt ?? '')?.[1] ?? '',
    regional: '',
    isAffix: looksLikeAffix(lemma),
    feminineOf: row.fem_of || undefined,
    regions: regionalOnly ? [...new Set(regions.flat())].join(', ') : undefined,
    variantOf: undefined,
    xref: inB1.map((other) => other.xref ?? '').join('; '),
    inWordGroupOnly: row.section === 'group',
    sameAs: undefined,
    dropped: false,
  }
}

function addedCandidate(addition: Addition): Candidate {
  return {
    listed: addition.word,
    word: addition.word,
    class: addition.class,
    level: addition.level,
    article: addition.article ?? '',
    plural: addition.plural ?? '',
    reflexive: '',
    feminine: '',
    regional: '',
    isAffix: false,
    feminineOf: undefined,
    regions: undefined,
    variantOf: undefined,
    xref: '',
    inWordGroupOnly: false,
    sameAs: undefined,
    dropped: false,
  }
}

const looksLikeAffix = (word: string) => word.startsWith('-') || word.endsWith('-')

function applyChanges(candidates: Candidate[], changes: Change[]): void {
  const byListed = new Map(candidates.map((candidate) => [candidate.listed, candidate]))
  const unknown = changes.filter((change) => !byListed.has(change.word)).map((change) => change.word)
  if (unknown.length > 0) {
    throw new Error(`the corrections name words that the lists do not have: ${unknown.join(', ')}`)
  }
  for (const change of changes) {
    const candidate = byListed.get(change.word) as Candidate
    if (change.rename !== undefined) {
      candidate.word = change.rename
      candidate.isAffix = looksLikeAffix(change.rename)
    }
    if (change.isWord !== undefined) candidate.isAffix = !change.isWord
    if (change.class !== undefined) candidate.class = change.class
    if (change.article !== undefined) candidate.article = change.article
    if (change.plural !== undefined) candidate.plural = change.plural
    if (change.reflexive !== undefined) candidate.reflexive = change.reflexive
    if (change.sameAs !== undefined) candidate.sameAs = change.sameAs
    if (change.drop) candidate.dropped = true
    if (change.feminineOf !== undefined) candidate.feminineOf = change.feminineOf ?? undefined
    if (change.variantOf === null) candidate.regions = undefined
    else if (change.variantOf !== undefined) {
      candidate.variantOf = change.variantOf
      candidate.regions = change.region ?? candidate.regions ?? 'A, CH'
    }
  }
}

/** The words a cross-reference names: "Fahrrad; D, A: Rad" names Fahrrad and Rad. */
const wordsIn = (xref: string) =>
  (xref.match(/\p{L}[\p{L}-]*/gu) ?? []).filter((word) => !['D', 'A', 'CH', 'der', 'die', 'das'].includes(word))

/** The scope word that an Austrian or Swiss word stands for: the one it refers to, or one that refers to it. */
function baseOfVariant(variant: Candidate, kept: Candidate[], byWord: Map<string, Candidate>): Candidate | undefined {
  if (variant.variantOf !== undefined) return byWord.get(variant.variantOf)
  for (const word of wordsIn(variant.xref)) {
    const base = byWord.get(word)
    if (base !== undefined) return base
  }
  return kept.find((candidate) => wordsIn(candidate.xref).includes(variant.word))
}

/** Dictionary order: "Ärztin" beside "Arzt", capitals beside small letters, a hyphen in front ignored. */
function inAlphabet(a: { word: string }, b: { word: string }): number {
  const letters = (word: string) => word.replace(/^[^\p{L}\p{N}]+/u, '')
  return letters(a.word).localeCompare(letters(b.word), 'de') || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0)
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

/** The corrections, inside the content folder. Written by hand. */
export const CORRECTIONS_FILE = 'vocabulary/scope-corrections.yaml'

/** Every headword the scope rule left out, inside the content folder. Written by `pnpm vocabulary:scope`. */
export const LEFT_OUT_FILE = 'vocabulary/left-out.tsv'

const wordClass = z.enum(WORD_CLASSES)

/** The shape of the corrections file. A key it does not know is an error, so a misspelt key is caught. */
export const correctionsSchema: z.ZodType<Corrections> = z.strictObject({
  classes: z.partialRecord(wordClass, z.array(z.string())),
  changes: z.array(
    z.strictObject({
      word: z.string(),
      reason: z.string().optional(),
      rename: z.string().optional(),
      class: wordClass.optional(),
      article: z.string().optional(),
      plural: z.string().optional(),
      reflexive: z.string().optional(),
      sameAs: z.string().optional(),
      drop: z.literal(true).optional(),
      isWord: z.boolean().optional(),
      feminineOf: z.string().nullable().optional(),
      variantOf: z.string().nullable().optional(),
      region: z.string().optional(),
    }),
  ),
  additions: z
    .array(
      z.strictObject({
        word: z.string(),
        class: wordClass,
        level: z.string().regex(/^[A-C][12]$/),
        article: z.string().optional(),
        plural: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .optional(),
})

/** The rows of a tab-separated table whose first line names the columns. */
export function parseTable(text: string): Row[] {
  const [header = '', ...lines] = text.split('\n')
  const columns = header.split('\t')
  return lines
    .filter((line) => line !== '')
    .map((line) => {
      const cells = line.split('\t')
      return Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? '']))
    })
}

const LEFT_OUT_COLUMNS = ['word', 'level', 'reason', 'notedOn'] as const

/** The text of the left-out file. */
export function formatLeftOut(leftOut: readonly LeftOut[]): string {
  const lines = leftOut.map((word) =>
    LEFT_OUT_COLUMNS.map((column) => word[column])
      .join('\t')
      .replace(/\t+$/, ''),
  )
  return `${[LEFT_OUT_COLUMNS.join('\t'), ...lines].join('\n')}\n`
}

/** The rows of the left-out file. */
export function parseLeftOut(text: string): LeftOut[] {
  return parseTable(text) as unknown as LeftOut[]
}
