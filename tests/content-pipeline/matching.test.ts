import { expect, test } from 'vitest'
import type { MatchingQuestion } from '../../src/content-model/index.ts'
import { compiledExtra, problemsOfExtra, withQuestion } from './extra-question.ts'

const pairs = [
  ['ich', 'wohne'],
  ['du', 'wohnst'],
  ['wir', 'wohnen'],
  ['ihr', 'wohnt'],
]
const matching = { type: 'matching', answer: pairs }

async function compiledMatching(question: Record<string, unknown>): Promise<MatchingQuestion> {
  const compiled = await compiledExtra(await withQuestion(question))
  if (compiled?.type !== 'matching') throw new Error('the question did not compile as matching')
  return compiled
}

test('a matching question is a list of pairs: each item and its partner', async () => {
  const compiled = await compiledMatching(matching)

  expect(compiled).toEqual({
    id: 'extra',
    type: 'matching',
    prompt: 'ich / du / wir / ihr',
    // The items keep the order they were written in.
    left: ['ich', 'du', 'wir', 'ihr'],
    right: expect.any(Array),
    // The partner of each item, in the order of the items.
    answer: ['wohne', 'wohnst', 'wohnen', 'wohnt'],
    explanation: expect.objectContaining({ en: ['With ', { de: 'du' }, ' the ending is ', { de: '-st' }, '.'] }),
  })
  // The app gets the same partners, mixed.
  expect([...compiled.right].sort()).toEqual(['wohne', 'wohnen', 'wohnst', 'wohnt'])
  expect(compiled.right).not.toEqual(compiled.answer)
})

test('the partners are mixed the same way wherever each pair stands in the file', async () => {
  const turned = await compiledMatching({ type: 'matching', answer: [...pairs].reverse() })

  expect(turned.left).toEqual(['ihr', 'wir', 'du', 'ich'])
  expect(turned.right).toEqual((await compiledMatching(matching)).right)
})

test('a matching question that states no pairs is rejected', async () => {
  const content = await withQuestion({ type: 'matching' })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer', message: 'no correct answer: the question states none' },
  ])
})

test('a matching answer that is not a list of pairs is rejected', async () => {
  const notPairs = 'must be the pairs, each one written as [item, partner]'

  expect(await problemsOfExtra(await withQuestion({ type: 'matching', answer: 'ich wohne' }))).toEqual([
    { where: 'answer', message: notPairs },
  ])
  expect(
    await problemsOfExtra(await withQuestion({ type: 'matching', answer: [...pairs, ['er', 'wohnt', 'sie']] })),
  ).toEqual([{ where: 'answer[4]', message: notPairs }])
})

test('a matching question with fewer than three pairs is rejected', async () => {
  const content = await withQuestion({ type: 'matching', answer: pairs.slice(0, 2) })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer', message: 'needs at least 3 pairs: with fewer there is nothing to match' },
  ])
})

test('a partner that fits two items is rejected: the pairs could be matched in two ways', async () => {
  const content = await withQuestion({ type: 'matching', answer: [...pairs, ['er', 'wohnt']] })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer[4]', message: '2 correct answers: "wohnt" is the partner of 2 items' },
  ])
})

test('an item that is listed twice is rejected', async () => {
  const content = await withQuestion({ type: 'matching', answer: [...pairs, ['ich', 'lerne']] })

  expect(await problemsOfExtra(content)).toEqual([
    { where: 'answer[4]', message: '2 correct answers: "ich" has 2 partners' },
  ])
})
