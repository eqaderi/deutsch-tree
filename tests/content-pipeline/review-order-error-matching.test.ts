import { expect, test } from 'vitest'
import { blindPool, recordReview } from '../../src/content-pipeline/review.ts'
import { changeNode, fixtureContent, fixtureContentWith, PUBLISHED, withoutReviewRecord } from './fixture.ts'
import { answered, RIGHT } from './review-sheet.ts'

const BY = { reviewer: 'Second fixture reviewer', date: '2026-02-03' }

/** What the reviewer sees of one question of the fixture node, in the content folder `content`. */
async function shown(content: string, id: string) {
  const sheet = await blindPool(content, 'grammar-001', [id])
  return sheet.questions[0]?.question
}

/** The disagreements when the fixture pool comes back with `answers` in place of the right ones. */
async function disagreementsWith(answers: Record<string, unknown>) {
  const content = await fixtureContentWith({ [PUBLISHED]: withoutReviewRecord })
  const sheet = answered(await blindPool(content, 'grammar-001'), { ...RIGHT, ...answers })
  const result = await recordReview(content, 'grammar-001', [sheet], BY)
  expect(result.record === null).toBe(result.disagreements.length > 0)
  return result.disagreements
}

// ---------- word ordering ----------

test('the reviewer sees the pieces of a word ordering question mixed, with the mark that ends the sentence', async () => {
  expect(await shown(fixtureContent, 'order-1')).toEqual({
    type: 'word-order',
    pieces: expect.arrayContaining(['wo', 'wohnst', 'du']),
    end: '?',
  })
})

test('how the pieces are mixed for the reviewer does not depend on the right order', async () => {
  // The same three pieces with each of their six orders as the only answer.
  const orders = [
    ['wo', 'wohnst', 'du'],
    ['wo', 'du', 'wohnst'],
    ['wohnst', 'wo', 'du'],
    ['wohnst', 'du', 'wo'],
    ['du', 'wo', 'wohnst'],
    ['du', 'wohnst', 'wo'],
  ]
  const sheets = new Set<string>()
  for (const order of orders) {
    const content = await fixtureContentWith({
      [PUBLISHED]: changeNode((node) => {
        node.questions.find((question: { id: string }) => question.id === 'order-1').answer = order
        node.status = 'coming-soon'
      }),
    })
    sheets.add(JSON.stringify(await shown(content, 'order-1')))
  }

  expect(sheets.size).toBe(1)
})

test('a reviewer who finds every right order agrees, in whatever order they are listed', async () => {
  expect(
    await disagreementsWith({
      'order-2': [
        ['ich', 'wohne', 'in Berlin'],
        ['in Berlin', 'wohne', 'ich'],
      ],
    }),
  ).toEqual([])
})

test('one right order may be given without the list around it', async () => {
  expect(await disagreementsWith({ 'order-1': ['wo', 'wohnst', 'du'] })).toEqual([])
})

test('a reviewer who finds a right order that the question does not list disagrees', async () => {
  const answer = [
    ['ich', 'wohne', 'in Berlin'],
    ['in Berlin', 'wohne', 'ich'],
    ['wohne', 'ich', 'in Berlin'],
  ]

  expect(await disagreementsWith({ 'order-2': answer })).toEqual([
    {
      question: 'order-2',
      problem: `the reviewer answered ${JSON.stringify(answer)}, the key says [["ich","wohne","in Berlin"],["in Berlin","wohne","ich"]]`,
    },
  ])
})

test('a reviewer who does not find a listed order disagrees', async () => {
  expect(await disagreementsWith({ 'order-2': [['ich', 'wohne', 'in Berlin']] })).toEqual([
    { question: 'order-2', problem: expect.stringContaining('the key says') },
  ])
})

test('a reviewer who puts the pieces in another order disagrees', async () => {
  expect(await disagreementsWith({ 'order-1': [['wo', 'du', 'wohnst']] })).toEqual([
    { question: 'order-1', problem: 'the reviewer answered [["wo","du","wohnst"]], the key says [["wo","wohnst","du"]]' },
  ])
})

// ---------- find the error ----------

test('the reviewer sees the sentence of a find the error question, not its wrong word', async () => {
  expect(await shown(fixtureContent, 'error-1')).toEqual({ type: 'find-error', prompt: 'Wir wohnst in Wien.' })
})

test('a reviewer who picks another word of the sentence disagrees', async () => {
  expect(await disagreementsWith({ 'error-1': 'Wir' })).toEqual([
    { question: 'error-1', problem: 'the reviewer answered "Wir", the key says "wohnst"' },
  ])
})

// ---------- matching ----------

test('the reviewer sees the two sides of a matching question, the partners mixed', async () => {
  expect(await shown(fixtureContent, 'match-1')).toEqual({
    type: 'matching',
    left: ['ich', 'du', 'wir'],
    right: expect.arrayContaining(['lerne', 'lernst', 'lernen']),
  })
})

test('how the partners are mixed for the reviewer does not depend on the pairs', async () => {
  // The same items and partners, paired in each of the six possible ways.
  const partnerOrders = [
    ['lerne', 'lernst', 'lernen'],
    ['lerne', 'lernen', 'lernst'],
    ['lernst', 'lerne', 'lernen'],
    ['lernst', 'lernen', 'lerne'],
    ['lernen', 'lerne', 'lernst'],
    ['lernen', 'lernst', 'lerne'],
  ]
  const sheets = new Set<string>()
  for (const [first, second, third] of partnerOrders) {
    const content = await fixtureContentWith({
      [PUBLISHED]: changeNode((node) => {
        node.questions.find((question: { id: string }) => question.id === 'match-1').answer = [
          ['ich', first],
          ['du', second],
          ['wir', third],
        ]
        node.status = 'coming-soon'
      }),
    })
    sheets.add(JSON.stringify(await shown(content, 'match-1')))
  }

  expect(sheets.size).toBe(1)
})

test('a reviewer who makes the same pairs agrees, in whatever order they are listed', async () => {
  expect(
    await disagreementsWith({
      'match-1': [
        ['du', 'lernst'],
        ['wir', 'lernen'],
        ['ich', 'lerne'],
      ],
    }),
  ).toEqual([])
})

test('a reviewer who swaps two partners disagrees', async () => {
  const answer = [
    ['ich', 'lernst'],
    ['du', 'lerne'],
    ['wir', 'lernen'],
  ]

  expect(await disagreementsWith({ 'match-1': answer })).toEqual([
    {
      question: 'match-1',
      problem: `the reviewer answered ${JSON.stringify(answer)}, the key says [["ich","lerne"],["du","lernst"],["wir","lernen"]]`,
    },
  ])
})
