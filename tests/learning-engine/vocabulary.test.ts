import { expect, test } from 'vitest'
import type { MeaningOfWordQuestion, Question, WordForMeaningQuestion } from '../../src/content-model/index.ts'
import { checkAnswer, rightAnswer, vocabularyPool } from '../../src/learning-engine/index.ts'
import { BETT, HOME, TISCH, TUER, word } from './words.ts'

/** The question of the pool that gives a meaning and asks for `word` in German. */
function intoGerman(pool: Question[], word: string): WordForMeaningQuestion {
  const question = pool.find((one) => one.type === 'word-for-meaning' && one.word === word)
  if (question?.type !== 'word-for-meaning') throw new Error(`the pool does not ask for ${word}`)
  return question
}

/** The question of the pool that gives `word` in German and asks what it means. */
function fromGerman(pool: Question[], word: string): MeaningOfWordQuestion {
  const question = pool.find((one) => one.type === 'meaning-of-word' && one.word === word)
  if (question?.type !== 'meaning-of-word') throw new Error(`the pool does not ask what ${word} means`)
  return question
}

test('asked for a noun in German, the learner must type it with its article', () => {
  const question = intoGerman(vocabularyPool(HOME), 'Tisch')

  expect(checkAnswer(question, 'der Tisch')).toEqual({ correct: true, notes: [], accepted: 'der Tisch' })
  expect(checkAnswer(question, 'Tisch').correct).toBe(false)
  expect(checkAnswer(question, 'das Tisch').correct).toBe(false)
  expect(checkAnswer(question, 'die Tisch').correct).toBe(false)
})

test('asked for a word in German, the learner reads its meaning in their language, or its German definition', () => {
  const question = intoGerman(vocabularyPool(HOME), 'Tisch')

  expect(question.prompt).toEqual({
    en: 'table',
    fa: 'میز',
    de: 'ein Möbelstück mit einer Platte und vier Beinen',
  })
  expect(rightAnswer(question)).toBe('der Tisch')
})

test('a word that is no noun is typed on its own', () => {
  const pool = vocabularyPool(HOME)

  expect(checkAnswer(intoGerman(pool, 'wohnen'), 'wohnen').correct).toBe(true)
  expect(checkAnswer(intoGerman(pool, 'groß'), 'groß').correct).toBe(true)
  expect(checkAnswer(intoGerman(pool, 'wohnen'), 'das wohnen').correct).toBe(false)
})

test('a noun that has only a plural is typed with the article of the plural', () => {
  const question = intoGerman(vocabularyPool(HOME), 'Möbel')

  expect(checkAnswer(question, 'die Möbel').correct).toBe(true)
  expect(checkAnswer(question, 'Möbel').correct).toBe(false)
  expect(checkAnswer(question, 'das Möbel').correct).toBe(false)
})

test('the small slips of any typed answer are accepted with a note, but never a missing article', () => {
  const question = intoGerman(vocabularyPool(HOME), 'Tür')

  expect(checkAnswer(question, ' die  Tuer ')).toEqual({
    correct: true,
    notes: ['umlaut-substitute'],
    accepted: 'die Tür',
  })
  expect(checkAnswer(question, 'Die tür')).toEqual({ correct: true, notes: ['capitalisation'], accepted: 'die Tür' })
  expect(checkAnswer(question, 'Tuer').correct).toBe(false)
  expect(checkAnswer(question, 'die Tur').correct).toBe(false)
  expect(checkAnswer(question, undefined).correct).toBe(false)
})

test('another German word that a word lists as right is accepted too, and nothing else', () => {
  const sofa = word({ word: 'Sofa', class: 'noun', article: 'das', plural: 'Sofas', alsoAccepted: ['die Couch'] })
  const question = intoGerman(vocabularyPool([sofa, ...HOME]), 'Sofa')

  expect(checkAnswer(question, 'die Couch')).toEqual({ correct: true, notes: [], accepted: 'die Couch' })
  expect(checkAnswer(question, 'das Sofa').correct).toBe(true)
  expect(checkAnswer(question, 'Couch').correct).toBe(false)
  expect(rightAnswer(question)).toBe('das Sofa')
})

test('asked what a German word means, the learner sees the word as it is learned and chooses among meanings', () => {
  const question = fromGerman(vocabularyPool(HOME), 'Tisch')

  expect(question.prompt).toBe('der Tisch')
  expect(question.options).toHaveLength(4)
  expect(question.options).toContainEqual({
    word: 'Tisch',
    meaning: { en: 'table', fa: 'میز', de: 'ein Möbelstück mit einer Platte und vier Beinen' },
  })
  expect(rightAnswer(question)).toBe('Tisch')
  expect(checkAnswer(question, 'Tisch')).toEqual({ correct: true, notes: [] })
  for (const option of question.options.filter((one) => one.word !== 'Tisch')) {
    expect(checkAnswer(question, option.word).correct).toBe(false)
  }
  expect(checkAnswer(question, undefined).correct).toBe(false)
})

test('the wrong options are meanings of other words of the node, of the same word class where it has enough', () => {
  const pool = vocabularyPool(HOME)
  const nouns = ['Tisch', 'Tür', 'Bett', 'Lampe', 'Stuhl', 'Möbel']

  for (const noun of nouns) {
    const offered = fromGerman(pool, noun).options.map((option) => option.word)
    expect(new Set(offered).size).toBe(4)
    expect(nouns).toEqual(expect.arrayContaining(offered))
  }
  // Two verbs and one adjective: other classes fill the options up.
  const offered = fromGerman(pool, 'wohnen').options.map((option) => option.word)
  expect(offered).toHaveLength(4)
  expect(offered).toEqual(expect.arrayContaining(['wohnen', 'kochen']))
})

test('the meaning of a word that is too close is never offered as a wrong option, whichever of the two says so', () => {
  const oma = word({ word: 'Oma', class: 'noun', article: 'die', plural: 'Omas', tooCloseTo: ['Großmutter'] })
  const grossmutter = word({ word: 'Großmutter', class: 'noun', article: 'die', plural: 'Großmütter' })
  // Three other nouns: without the rule, each of the two would have to offer the other.
  const pool = vocabularyPool([oma, grossmutter, TISCH, TUER, BETT])

  expect(
    fromGerman(pool, 'Oma')
      .options.map((option) => option.word)
      .sort(),
  ).toEqual(['Bett', 'Oma', 'Tisch', 'Tür'])
  expect(
    fromGerman(pool, 'Großmutter')
      .options.map((option) => option.word)
      .sort(),
  ).toEqual(['Bett', 'Großmutter', 'Tisch', 'Tür'])
})

test('the right option does not always stand in the same place', () => {
  const places = new Set(
    vocabularyPool(HOME)
      .filter((question) => question.type === 'meaning-of-word')
      .map((question) => question.options.findIndex((option) => option.word === question.word)),
  )

  expect(places.size).toBeGreaterThan(2)
})

test('the pool asks every word in both directions, and is the same pool every time it is made', () => {
  const pool = vocabularyPool(HOME)

  expect(pool).toHaveLength(2 * HOME.length)
  for (const { word } of HOME) {
    expect(fromGerman(pool, word).word).toBe(word)
    expect(intoGerman(pool, word).word).toBe(word)
  }
  expect(vocabularyPool(HOME)).toEqual(pool)
})

test('every question has an id of its own that stays with its word wherever the word stands in the node', () => {
  const pool = vocabularyPool(HOME)
  const reordered = vocabularyPool([...HOME].reverse())

  expect(new Set(pool.map((question) => question.id)).size).toBe(pool.length)
  for (const { word } of HOME) {
    expect(fromGerman(reordered, word).id).toBe(fromGerman(pool, word).id)
    expect(intoGerman(reordered, word).id).toBe(intoGerman(pool, word).id)
  }
})

test('an id does not give the word away: it is shown where the word is asked for', () => {
  for (const { word } of HOME) {
    const { id } = intoGerman(vocabularyPool(HOME), word)

    expect(id).toMatch(/^w[a-z0-9]{7}-word$/)
    expect(id).not.toContain(word.toLowerCase().slice(0, 3))
  }
})

test('the reason of a vocabulary question is the word with its meaning and its example sentence', () => {
  const pool = vocabularyPool(HOME)
  const reason = {
    en: [{ de: 'der Tisch' }, ': table. ', { de: 'Das Essen steht auf dem Tisch.' }],
    fa: [{ de: 'der Tisch' }, ': میز. ', { de: 'Das Essen steht auf dem Tisch.' }],
    de: [{ de: 'der Tisch: ein Möbelstück mit einer Platte und vier Beinen. Das Essen steht auf dem Tisch.' }],
  }

  expect(fromGerman(pool, 'Tisch').explanation).toEqual(reason)
  expect(intoGerman(pool, 'Tisch').explanation).toEqual(reason)
})
