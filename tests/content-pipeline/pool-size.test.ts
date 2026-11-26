import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import {
  COMING_SOON,
  changeNode,
  changeReviewedNode,
  fixtureContent,
  fixtureContentWith,
  PUBLISHED,
  VOCABULARY,
} from './fixture.ts'

test('a published pool must be larger than its attempt, so that a retry draws another set', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeReviewedNode((node) => {
      node.questions = node.questions.slice(0, 15)
      node.attemptSize = 15
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PUBLISHED,
      node: 'grammar-001',
      where: 'attemptSize',
      message:
        'pool too small for its attempt: an attempt draws 15 questions and the pool has 15, so every retry asks the same ones; write more questions or lower attemptSize',
    },
  ])
})

test('a vocabulary test asks about a word once, so a published vocabulary node needs more words than its attempt', async () => {
  const content = await fixtureContentWith({
    [VOCABULARY]: changeReviewedNode((node) => {
      node.attemptSize = 11
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: VOCABULARY,
      node: 'vocabulary-fixture-home',
      where: 'attemptSize',
      message:
        'too few words for its attempt: an attempt asks about 11 words and the node has 11, so every retry asks about the same ones; add words or lower attemptSize',
    },
  ])
})

test('a published node whose pool is below the minimum size is rejected', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeReviewedNode((node) => {
      node.questions = node.questions.slice(0, 14)
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PUBLISHED,
      node: 'grammar-001',
      where: 'questions',
      message: 'pool too small: a published node needs at least 15 questions, this one has 14',
    },
  ])
  expect(report.ok).toBe(false)
  expect(bundle).toBeNull()
})

test('the minimum is not for an exam part: it asks one whole task of its part, which is far smaller', async () => {
  // The fixture exam part is published with two practice tasks of six items each, and no pool.
  const { report, bundle } = await compileContent(fixtureContent)

  expect(report.errors).toEqual([])
  expect(bundle?.nodes.find((node) => node.id === 'exam-lesen-1')).toMatchObject({ status: 'published' })
})

test('a "coming soon" node may hold a pool that is still being written', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.questions = [
        {
          id: 'q1',
          type: 'multiple-choice',
          prompt: 'Wir ___ hier.',
          options: ['wohnen', 'wohnst'],
          answer: 'wohnen',
          explanation: { en: 'With wir the ending is -en.', fa: 'با *wir* پایانه *-en* است.', de: 'Bei wir: -en.' },
        },
      ]
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([])
})
