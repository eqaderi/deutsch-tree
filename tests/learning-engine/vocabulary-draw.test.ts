import { expect, test } from 'vitest'
import type { Question } from '../../src/content-model/index.ts'
import { drawAttempt, drawCheckpoint, drawQuestions, vocabularyPool } from '../../src/learning-engine/index.ts'
import { questions } from './questions.ts'
import { seededRandom } from './random.ts'
import { HOME, word } from './words.ts'

/** Twenty-five nouns, as a full vocabulary node has: a pool of fifty questions. */
const NODE = Array.from({ length: 25 }, (_, index) =>
  word({ word: `Wort${index + 1}`, class: 'noun', article: 'das', plural: `Wörter${index + 1}` }),
)

const idOf = (question: Question) => question.id
const wordOf = (question: Question) => ('word' in question ? question.word : undefined)
const asking = (attempt: Question[], type: Question['type']) =>
  attempt.filter((question) => question.type === type).length

test('an attempt at a vocabulary test asks about a word in one direction only', () => {
  const pool = vocabularyPool(NODE)

  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const attempt = drawQuestions(pool, 15, seededRandom(seed))

    expect(attempt).toHaveLength(15)
    expect(new Set(attempt.map(wordOf)).size).toBe(15)
    expect(pool.map(idOf)).toEqual(expect.arrayContaining(attempt.map(idOf)))
  }
})

test('every attempt asks in both directions, as often in one as in the other', () => {
  const pool = vocabularyPool(NODE)

  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const even = drawQuestions(pool, 10, seededRandom(seed))
    expect(asking(even, 'meaning-of-word')).toBe(5)
    expect(asking(even, 'word-for-meaning')).toBe(5)

    const odd = drawQuestions(pool, 15, seededRandom(seed))
    expect([7, 8]).toContain(asking(odd, 'meaning-of-word'))
    expect(asking(odd, 'meaning-of-word') + asking(odd, 'word-for-meaning')).toBe(15)
  }
})

test('over many attempts every word is asked in each direction', () => {
  const pool = vocabularyPool(NODE)
  const random = seededRandom(11)

  const asked = new Set(
    Array.from({ length: 60 }, () => drawQuestions(pool, 15, random)).flatMap((attempt) =>
      attempt.map((question) => question.id),
    ),
  )

  expect(asked.size).toBe(pool.length)
})

test('a node with fewer words than an attempt asks some words in both directions, and no question twice', () => {
  // Nine words, eighteen questions.
  const pool = vocabularyPool(HOME)

  const attempt = drawQuestions(pool, 12, seededRandom(4))

  expect(attempt).toHaveLength(12)
  expect(new Set(attempt.map((question) => question.id)).size).toBe(12)
  expect(new Set(attempt.map(wordOf)).size).toBe(9)
})

test('a pool of other questions is drawn as before: any questions, in the same random order', () => {
  const pool = questions(20)

  expect(drawQuestions(pool, 10, seededRandom(3)).map(idOf)).toEqual(drawAttempt(pool, 10, seededRandom(3)).map(idOf))
})

test('a checkpoint asks about a word of a vocabulary node in one direction only', () => {
  const sources = [{ nodeId: 'vocabulary-home', questions: vocabularyPool(NODE) }]

  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
    const checkpoint = drawCheckpoint(sources, seededRandom(seed))

    expect(checkpoint.questions).toHaveLength(5)
    expect(new Set(checkpoint.questions.map(({ question }) => wordOf(question))).size).toBe(5)
  }
})
