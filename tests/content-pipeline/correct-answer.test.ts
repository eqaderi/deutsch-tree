import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { changeNode, fixtureContentWith, PUBLISHED } from './fixture.ts'

const inQuestion2 = { file: PUBLISHED, node: 'grammar-001', question: 'q2' }

test('a question whose answer is none of its options is rejected, and the report names the question', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.questions[1].answer = 'wohnt'
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      ...inQuestion2,
      where: 'questions[1].answer',
      message: 'no correct answer: "wohnt" is not one of the options',
    },
  ])
  expect(bundle).toBeNull()
})

test('a question that states no answer is rejected', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      delete node.questions[1].answer
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    { ...inQuestion2, where: 'questions[1].answer', message: 'no correct answer: the question states none' },
  ])
  expect(bundle).toBeNull()
})

test('a question that states two answers where one is required is rejected', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.questions[1].answer = ['wohnst', 'wohnen']
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      ...inQuestion2,
      where: 'questions[1].answer',
      message: '2 correct answers: a multiple-choice question has exactly one',
    },
  ])
  expect(bundle).toBeNull()
})

test('a question whose answer matches two of its options is rejected', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.questions[1].options = ['wohne', 'wohnst', 'wohnst']
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      ...inQuestion2,
      where: 'questions[1].answer',
      message: '2 correct answers: "wohnst" is in the options 2 times',
    },
  ])
  expect(bundle).toBeNull()
})
