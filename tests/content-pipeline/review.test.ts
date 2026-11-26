import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { blindPool, recordReview } from '../../src/content-pipeline/review.ts'
import { changeNode, fixtureContent, fixtureContentWith, PUBLISHED, withoutReviewRecord } from './fixture.ts'
import { answered, RIGHT } from './review-sheet.ts'

const BY = { reviewer: 'Second fixture reviewer', date: '2026-02-03' }

test('the blind pool holds every question without its answer or its explanation', async () => {
  const sheet = await blindPool(fixtureContent, 'grammar-001')

  expect(sheet.node).toBe('grammar-001')
  expect(sheet.questions.map((entry) => entry.id)).toEqual(Object.keys(RIGHT))
  expect(sheet.questions.slice(0, 2)).toEqual([
    {
      id: 'q1',
      question: { type: 'multiple-choice', prompt: 'Ich ___ in Berlin.', options: ['wohne', 'wohnst', 'wohnt'] },
      answerFormat: expect.any(String),
      answer: null,
      objection: null,
    },
    {
      id: 'q2',
      question: { type: 'multiple-choice', prompt: 'Du ___ hier.', options: ['wohne', 'wohnst', 'wohnen'] },
      answerFormat: expect.any(String),
      answer: null,
      objection: null,
    },
  ])
  const SHOWN: Record<string, string[]> = {
    'multiple-choice': ['options', 'prompt', 'type'],
    'gap-fill': ['options', 'prompt', 'type'],
    'true-false': ['prompt', 'type'],
    'find-error': ['prompt', 'type'],
    'word-order': ['end', 'pieces', 'type'],
    matching: ['left', 'right', 'type'],
  }
  for (const entry of sheet.questions) {
    expect(Object.keys(entry.question).sort()).toEqual(SHOWN[String(entry.question.type)])
  }
  expect(JSON.stringify(sheet)).not.toContain('the ending is')
})

test('an answer that differs from the key is listed, and no record is written', async () => {
  const content = await unreviewedFixture()
  const before = await readFile(path.join(content, PUBLISHED), 'utf8')
  const sheet = answered(await blindPool(content, 'grammar-001'), { ...RIGHT, q2: 'wohnen' })

  const result = await recordReview(content, 'grammar-001', [sheet], BY)

  expect(result.record).toBeNull()
  expect(result.disagreements).toEqual([
    { question: 'q2', problem: 'the reviewer answered "wohnen", the key says "wohnst"' },
  ])
  expect(await readFile(path.join(content, PUBLISHED), 'utf8')).toBe(before)
})

test('a review with no disagreement is recorded with the node, and the node can then be published', async () => {
  const content = await unreviewedFixture()
  expect((await compileContent(content)).report.ok).toBe(false)
  const sheet = answered(await blindPool(content, 'grammar-001'), RIGHT)

  const result = await recordReview(content, 'grammar-001', [sheet], BY)

  expect(result.disagreements).toEqual([])
  expect(result.record).toMatchObject(BY)
  const nodeFile = await readFile(path.join(content, PUBLISHED), 'utf8')
  expect(nodeFile).toContain('reviewer: Second fixture reviewer')
  expect(nodeFile).toContain('date: 2026-02-03')
  expect((await compileContent(content)).report).toMatchObject({ ok: true, errors: [] })
})

test('a new review replaces the record of an earlier one', async () => {
  const content = await fixtureContentWith({})
  const sheet = answered(await blindPool(content, 'grammar-001'), RIGHT)

  await recordReview(content, 'grammar-001', [sheet], BY)

  const nodeFile = await readFile(path.join(content, PUBLISHED), 'utf8')
  expect(nodeFile.match(/^review:/gm)).toHaveLength(1)
  expect(nodeFile).toContain('reviewer: Second fixture reviewer')
  expect((await compileContent(content)).report.ok).toBe(true)
})

test("a reviewer's objection to a question is listed even when the answer matches the key", async () => {
  const content = await unreviewedFixture()
  const sheet = answered(await blindPool(content, 'grammar-001'), RIGHT, { q1: 'Two options are right.' })

  const result = await recordReview(content, 'grammar-001', [sheet], BY)

  expect(result.record).toBeNull()
  expect(result.disagreements).toEqual([{ question: 'q1', problem: 'the reviewer objects: Two options are right.' }])
})

test('a question the reviewer left out or left unanswered is listed', async () => {
  const content = await unreviewedFixture()
  const everyQuestionButTheFirst = Object.keys(RIGHT).slice(1)
  const sheet = answered(await blindPool(content, 'grammar-001', everyQuestionButTheFirst), { ...RIGHT, q2: null })

  const result = await recordReview(content, 'grammar-001', [sheet], BY)

  expect(result.record).toBeNull()
  expect(result.disagreements).toEqual([
    { question: 'q1', problem: expect.stringContaining('no reviewer has seen this question') },
    { question: 'q2', problem: 'the reviewer gave no answer' },
  ])
})

test('a question that was changed to settle a disagreement needs a fresh answer, and only that one', async () => {
  const content = await unreviewedFixture()
  const first = answered(await blindPool(content, 'grammar-001'), { ...RIGHT, q2: 'wohnen' })
  const changed = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      delete node.review
      node.questions[1].prompt = 'Du ___ in Bonn.'
      node.questions[1].options = ['wohne', 'wohnst', 'wohnt']
    }),
  })

  const stillOpen = await recordReview(changed, 'grammar-001', [first], BY)

  expect(stillOpen.record).toBeNull()
  expect(stillOpen.disagreements).toEqual([
    { question: 'q2', problem: expect.stringContaining('the question changed after the reviewer saw it') },
  ])

  const second = answered(await blindPool(changed, 'grammar-001', ['q2']), { q2: 'wohnst' })
  expect(second.questions.map((entry) => entry.id)).toEqual(['q2'])

  const settled = await recordReview(changed, 'grammar-001', [first, second], BY)

  expect(settled.disagreements).toEqual([])
  expect((await compileContent(changed)).report.ok).toBe(true)
})

test('a key that was corrected to settle a disagreement needs no second pass', async () => {
  const wrongKey = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      delete node.review
      node.questions[1].answer = 'wohnen'
    }),
  })
  const sheet = answered(await blindPool(wrongKey, 'grammar-001'), RIGHT)
  expect((await recordReview(wrongKey, 'grammar-001', [sheet], BY)).disagreements).toEqual([
    { question: 'q2', problem: 'the reviewer answered "wohnst", the key says "wohnen"' },
  ])
  const correctedKey = await unreviewedFixture()

  const result = await recordReview(correctedKey, 'grammar-001', [sheet], BY)

  expect(result.disagreements).toEqual([])
  expect(result.record).not.toBeNull()
})

test('a sheet for another node is refused', async () => {
  const content = await unreviewedFixture()
  const sheet = {
    ...answered(await blindPool(content, 'grammar-001'), RIGHT),
    node: 'grammar-002',
  }

  await expect(recordReview(content, 'grammar-001', [sheet], BY)).rejects.toThrow('grammar-002')
})

/** The fixture content as it is before any review: the published node has no review record. */
function unreviewedFixture(): Promise<string> {
  return fixtureContentWith({ [PUBLISHED]: withoutReviewRecord })
}
