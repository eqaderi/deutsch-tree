/**
 * Seam: `buildScopeList`, the function that turns the extracted word lists
 * into the scope list. The rows here are invented; the real lists stay
 * outside the repository.
 */
import { expect, test } from 'vitest'
import { buildScopeList, type Corrections, SCOPE_RULE, type ScopeRule } from '../../src/vocabulary-scope/index.ts'

/** A row of the merged list (`union-headwords.tsv`), with every other column empty. */
const merged = (lemma: string, fields: Record<string, string> = {}) => ({
  lemma,
  level: 'a1',
  in_lists: fields.level ?? 'a1',
  pos: /^\p{Lu}/u.test(lemma) ? 'noun' : 'other',
  article: '',
  plural: '',
  number: '',
  reflexive: '',
  alt: '',
  section: 'alpha',
  fem_of: '',
  ...fields,
})

/** A row of the B1 list (`b1-headwords.tsv`), the only list with region marks. */
const b1 = (lemma: string, fields: Record<string, string> = {}) => ({
  lemma,
  pos: /^\p{Lu}/u.test(lemma) ? 'noun' : 'other',
  region: '',
  xref: '',
  ...fields,
})

const NO_CORRECTIONS: Corrections = { classes: {}, changes: [] }

const build = (
  rows: Array<Record<string, string>>,
  options: { b1?: Array<Record<string, string>>; corrections?: Partial<Corrections>; rule?: Partial<ScopeRule> } = {},
) =>
  buildScopeList({
    merged: rows,
    b1: options.b1 ?? [],
    corrections: { ...NO_CORRECTIONS, ...options.corrections },
    rule: { ...SCOPE_RULE, ...options.rule },
  })

/** "der Tisch (-e) A1" */
const inWords = (result: ReturnType<typeof build>) =>
  result.words.map((word) =>
    [word.article, word.word, word.plural && `(${word.plural})`, word.level].filter(Boolean).join(' '),
  )

test('a noun and a verb keep their article, plural marker and class, and carry their lowest level', () => {
  const result = build([
    merged('Tisch', { article: 'der', plural: '-e', level: 'a1', in_lists: 'a1,a2,b1' }),
    merged('freuen', { pos: 'verb', reflexive: '(sich)', level: 'a2' }),
    merged('Eltern', { article: 'die', number: 'pl', level: 'b1' }),
  ])

  expect(result.words).toEqual([
    {
      word: 'Eltern',
      class: 'noun',
      level: 'B1',
      article: 'die',
      plural: 'pl',
      reflexive: '',
      feminine: '',
      regional: '',
    },
    {
      word: 'freuen',
      class: 'verb',
      level: 'A2',
      article: '',
      plural: '',
      reflexive: '(sich)',
      feminine: '',
      regional: '',
    },
    {
      word: 'Tisch',
      class: 'noun',
      level: 'A1',
      article: 'der',
      plural: '-e',
      reflexive: '',
      feminine: '',
      regional: '',
    },
  ])
  expect(result.leftOut).toEqual([])
})

test('the scope rule leaves out word-building parts, and the result says so', () => {
  const rows = [merged('Tisch', { article: 'der' }), merged('Lieblings-'), merged('un-'), merged('-weise')]

  const result = build(rows)

  expect(inWords(result)).toEqual(['der Tisch A1'])
  expect(result.leftOut).toEqual([
    { word: 'Lieblings-', level: 'A1', reason: 'affix', notedOn: '' },
    { word: 'un-', level: 'A1', reason: 'affix', notedOn: '' },
    { word: '-weise', level: 'A1', reason: 'affix', notedOn: '' },
  ])
})

test('a feminine form is not a word of its own: it is noted on the masculine noun', () => {
  const result = build([
    merged('Arzt', { article: 'der', plural: '¨-e' }),
    merged('Ärztin', { article: 'die', plural: '-nen', fem_of: 'Arzt', level: 'a2' }),
  ])

  expect(result.words).toEqual([expect.objectContaining({ word: 'Arzt', level: 'A1', feminine: 'Ärztin' })])
  expect(result.leftOut).toEqual([{ word: 'Ärztin', level: 'A2', reason: 'feminine form', notedOn: 'Arzt' }])
})

test('a word marked for Austria or Switzerland only is noted on the word used in Germany', () => {
  const result = build(
    [
      merged('Aprikose', { article: 'die', level: 'b1', in_lists: 'b1' }),
      merged('Marille', { article: 'die', level: 'b1', in_lists: 'b1' }),
      merged('Velo', { article: 'das', level: 'b1', in_lists: 'b1' }),
      merged('Fahrrad', { article: 'das', level: 'a1', in_lists: 'a1,a2,b1' }),
      merged('Kanton', { article: 'der', level: 'b1', in_lists: 'b1' }),
    ],
    {
      b1: [
        b1('Aprikose', { region: 'D, CH', xref: 'A: Marille' }),
        b1('Marille', { region: 'A', xref: 'D, CH: Aprikose' }),
        b1('Velo', { region: 'CH', xref: 'Fahrrad; D, A: Rad' }),
        b1('Fahrrad', { xref: 'D, A: Rad; CH: Velo' }),
        b1('Kanton', { region: 'CH' }),
      ],
    },
  )

  expect(result.words.map((word) => [word.word, word.regional])).toEqual([
    ['Aprikose', 'Marille (A)'],
    ['Fahrrad', 'Velo (CH)'],
  ])
  expect(result.leftOut).toEqual([
    { word: 'Kanton', level: 'B1', reason: 'regional variant', notedOn: '' },
    { word: 'Marille', level: 'B1', reason: 'regional variant', notedOn: 'Aprikose' },
    { word: 'Velo', level: 'B1', reason: 'regional variant', notedOn: 'Fahrrad' },
  ])
})

test('a word is not regional when the B1 list also prints it without a region, or when a lower list has it', () => {
  const result = build(
    [
      merged('Pension', { level: 'b1', in_lists: 'b1' }),
      merged('Ferien', { level: 'a2', in_lists: 'a2,b1' }),
      merged('kosten', { pos: 'verb', level: 'a1', in_lists: 'a1,a2,b1' }),
    ],
    {
      b1: [
        b1('Pension'),
        b1('Pension', { region: 'A, CH', xref: 'D, CH: Rente' }),
        b1('Ferien', { region: 'CH', xref: 'D, A: Urlaub' }),
        b1('kosten', { pos: 'verb', region: 'A', xref: 'D, CH: probieren' }),
      ],
    },
  )

  expect(result.words.map((word) => word.word)).toEqual(['Ferien', 'kosten', 'Pension'])
  expect(result.leftOut).toEqual([])
})

test('another answer to the scope question is another setting of the rule, not another program', () => {
  const rows = [
    merged('Arzt', { article: 'der' }),
    merged('Ärztin', { article: 'die', fem_of: 'Arzt' }),
    merged('Lieblings-'),
    merged('Marille', { level: 'b1', in_lists: 'b1' }),
    merged('Januar', { section: 'group' }),
  ]
  const marks = [b1('Marille', { region: 'A' })]

  const everything = build(rows, {
    b1: marks,
    rule: { affixes: 'include', feminineForms: 'include', regionalVariants: 'include', wordGroups: 'include' },
  })
  const alphabeticalListsOnly = build(rows, { b1: marks, rule: { wordGroups: 'leave-out' } })

  expect(everything.words.map((word) => word.word)).toEqual(['Arzt', 'Ärztin', 'Januar', 'Lieblings-', 'Marille'])
  expect(everything.leftOut).toEqual([])
  expect(alphabeticalListsOnly.words.map((word) => word.word)).toEqual(['Arzt'])
  expect(alphabeticalListsOnly.leftOut).toContainEqual({
    word: 'Januar',
    level: 'A1',
    reason: 'word group',
    notedOn: '',
  })
})

test('a word that is neither noun nor verb gets its word class from the corrections', () => {
  const result = build([merged('alt'), merged('aber'), merged('zum Beispiel')], {
    corrections: { classes: { adjective: ['alt'], conjunction: ['aber'], phrase: ['zum Beispiel'] } },
  })

  expect(result.words.map((word) => [word.word, word.class])).toEqual([
    ['aber', 'conjunction'],
    ['alt', 'adjective'],
    ['zum Beispiel', 'phrase'],
  ])
})

test('a word without a word class stops the build, and the message names it', () => {
  expect(() => build([merged('alt'), merged('aber')], { corrections: { classes: { adjective: ['alt'] } } })).toThrow(
    'no word class for: aber',
  )
})

test('the stem of a word that takes endings is a word under its full form, not a word-building part', () => {
  const result = build([merged('ander-'), merged('Lieblings-')], {
    corrections: { classes: { pronoun: ['andere'] }, changes: [{ word: 'ander-', rename: 'andere' }] },
  })

  expect(result.words.map((word) => word.word)).toEqual(['andere'])
  expect(result.leftOut.map((word) => word.word)).toEqual(['Lieblings-'])
})

test('two spellings of one word are one word, at the lower level of the two', () => {
  const result = build([merged('gern(e)', { level: 'a1' }), merged('gern', { level: 'a2' })], {
    corrections: { classes: { adverb: ['gern'] }, changes: [{ word: 'gern(e)', sameAs: 'gern' }] },
  })

  expect(inWords(result)).toEqual(['gern A1'])
  expect(result.leftOut).toEqual([{ word: 'gern(e)', level: 'A1', reason: 'same word', notedOn: 'gern' }])
})

test('a correction can set the class, article and plural, and decide what the lists got wrong', () => {
  const result = build(
    [
      merged('Prost'),
      merged('Klassenfahrt'),
      merged('Zeuge', { article: 'der' }),
      merged('Zeug', { article: 'das' }),
      merged('Zeugin', { article: 'die', fem_of: 'Zeug' }),
      merged('Jänner', { level: 'b1', in_lists: 'b1' }),
      merged('Januar'),
      merged('Gasthaus', { level: 'b1', in_lists: 'b1' }),
      merged('Kusine', { fem_of: 'Kus' }),
      merged('was für ein-'),
    ],
    {
      b1: [b1('Jänner', { region: 'A' }), b1('Gasthaus', { region: 'A' })],
      corrections: {
        changes: [
          { word: 'Prost', class: 'interjection' },
          { word: 'Klassenfahrt', article: 'die', plural: '-en' },
          { word: 'Zeugin', feminineOf: 'Zeuge' },
          { word: 'Jänner', variantOf: 'Januar' },
          { word: 'Gasthaus', variantOf: null },
          { word: 'Kusine', feminineOf: null },
          { word: 'was für ein-', drop: true },
        ],
        additions: [{ word: 'Hausfrau', class: 'noun', level: 'A1', article: 'die', plural: '-en' }],
      },
    },
  )

  expect(
    result.words.map((word) =>
      [word.article, word.word, word.plural, word.class, word.feminine, word.regional].join('|'),
    ),
  ).toEqual([
    '|Gasthaus||noun||',
    'die|Hausfrau|-en|noun||',
    '|Januar||noun||Jänner (A)',
    'die|Klassenfahrt|-en|noun||',
    '|Kusine||noun||',
    '|Prost||interjection||',
    'das|Zeug||noun||',
    'der|Zeuge||noun|Zeugin|',
  ])
  expect(result.leftOut.map((word) => [word.word, word.reason, word.notedOn])).toEqual([
    ['Jänner', 'regional variant', 'Januar'],
    ['was für ein-', 'no word', ''],
    ['Zeugin', 'feminine form', 'Zeuge'],
  ])
})

test('a correction for a word the lists do not have stops the build: the corrections are out of date', () => {
  expect(() => build([merged('Tisch')], { corrections: { changes: [{ word: 'Tish', article: 'der' }] } })).toThrow(
    'the corrections name words that the lists do not have: Tish',
  )
})

test('two words that end up with the same spelling stop the build', () => {
  expect(() =>
    build([merged('jeder'), merged('jed-')], {
      corrections: { classes: { pronoun: ['jeder'] }, changes: [{ word: 'jed-', rename: 'jeder' }] },
    }),
  ).toThrow('two headwords are spelled "jeder"')
})

test('a feminine form printed in the cell of the masculine noun is noted on it too', () => {
  const result = build([
    merged('Fahrer', { article: 'der', alt: 'Fahrerin, -nen' }),
    merged('Club', { alt: 'Klub, -s' }),
  ])

  expect(result.words.map((word) => [word.word, word.feminine])).toEqual([
    ['Club', ''],
    ['Fahrer', 'Fahrerin'],
  ])
})

test('a correction can name the region of a variant that the lists print without one', () => {
  const result = build([merged('Hausmeister'), merged('Abwart', { level: 'b1', in_lists: 'b1' })], {
    b1: [b1('Abwart')],
    corrections: { changes: [{ word: 'Abwart', variantOf: 'Hausmeister', region: 'CH' }] },
  })

  expect(result.words.map((word) => [word.word, word.regional])).toEqual([['Hausmeister', 'Abwart (CH)']])
})
