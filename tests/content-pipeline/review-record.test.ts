import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, fixtureContentWith, PUBLISHED, withoutReviewRecord } from './fixture.ts'

test('a published node with no review record is refused', async () => {
  const content = await fixtureContentWith({ [PUBLISHED]: withoutReviewRecord })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PUBLISHED,
      node: 'grammar-001',
      where: 'review',
      message: expect.stringContaining('needs a review record'),
    },
  ])
  expect(report.ok).toBe(false)
  expect(bundle).toBeNull()
})

test('a published node whose question changed after its review needs a new review', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.questions[0].options = ['wohne', 'wohnst', 'wohnen']
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: PUBLISHED, node: 'grammar-001', where: 'review', message: expect.stringContaining('needs a new review') },
  ])
  expect(report.ok).toBe(false)
  expect(bundle).toBeNull()
})

test('a published node whose answer key changed after its review needs a new review', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.questions[0].answer = 'wohnt'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: PUBLISHED, node: 'grammar-001', where: 'review', message: expect.stringContaining('needs a new review') },
  ])
})

test('an explanation may change after the review: the reviewer never saw it', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.questions[0].explanation.en = 'After ich the verb ends in -e.'
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([])
})

test('a "coming soon" node needs no review record', async () => {
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.questions = [
        {
          id: 'q1',
          type: 'multiple-choice',
          prompt: 'Wir ___ hier.',
          options: ['wohnen', 'wohnst'],
          answer: 'wohnen',
          explanation: { en: 'With wir the ending is -en.', fa: 'با wir پایانه -en است.', de: 'Bei wir: -en.' },
        },
      ]
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([])
})
