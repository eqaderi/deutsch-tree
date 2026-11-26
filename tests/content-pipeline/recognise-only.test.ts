import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, fixtureContentWith, PUBLISHED } from './fixture.ts'

const PRODUCING = 'a recognise-only node asks only for understanding'

test('a recognise-only node whose pool asks the learner to produce the form is rejected, once per such question', async () => {
  // The fixture's published node has two word ordering questions, in which the learner builds the sentence.
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.recogniseOnly = true
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PUBLISHED,
      node: 'grammar-001',
      question: 'order-1',
      where: 'questions[15].type',
      message: `a word-order question asks the learner to produce the form, but ${PRODUCING}: use multiple-choice, gap-fill, true-false, find-error or matching`,
    },
    {
      file: PUBLISHED,
      node: 'grammar-001',
      question: 'order-2',
      where: 'questions[16].type',
      message: `a word-order question asks the learner to produce the form, but ${PRODUCING}: use multiple-choice, gap-fill, true-false, find-error or matching`,
    },
  ])
  expect(bundle).toBeNull()
})

test('a typed question in the draft pool of a recognise-only node is rejected too', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.recogniseOnly = true
      node.questions = [
        {
          id: 'q1',
          type: 'typed-gap-fill',
          prompt: 'Du ___ (sein) müde.',
          answers: ['bist'],
          explanation: { en: 'With du: bist.', fa: 'با *du*: *bist*.', de: 'Bei du: bist.' },
        },
        {
          id: 'q2',
          type: 'typed-answer',
          prompt: 'sein, du',
          answers: ['du bist'],
          explanation: { en: 'With du: bist.', fa: 'با *du*: *bist*.', de: 'Bei du: bist.' },
        },
        {
          id: 'q3',
          type: 'true-false',
          prompt: 'Du bist müde.',
          answer: true,
          explanation: { en: 'With du: bist.', fa: 'با *du*: *bist*.', de: 'Bei du: bist.' },
        },
      ]
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors.map(({ question, message }) => [question, message.split(',')[0]])).toEqual([
    ['q1', 'a typed-gap-fill question asks the learner to produce the form'],
    ['q2', 'a typed-answer question asks the learner to produce the form'],
  ])
})

test('a recognise-only node whose pool asks only for understanding is accepted', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.recogniseOnly = true
      node.questions = node.questions.filter((question: { type: string }) => question.type !== 'word-order')
      delete node.review
    }),
  })

  const { report } = await compileContent(content)

  // Only the review is missing: the questions changed. No question type is refused.
  expect(report.errors.map(({ message }) => message)).toEqual([expect.stringContaining('needs a review record')])
})
