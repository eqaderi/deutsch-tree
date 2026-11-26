import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { changeNode, fixtureContentWith, PUBLISHED } from './fixture.ts'

test('a node with a missing language is rejected, and the report names the node and the language', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      delete node.title.fa
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    { file: PUBLISHED, node: 'grammar-001', where: 'title.fa', message: 'is missing; this text is needed in fa' },
  ])
  expect(report.ok).toBe(false)
  expect(bundle).toBeNull()
})

test('a missing language is reported wherever learner-language text is written', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      delete node.explanations.de
      delete node.examples[1].en
      delete node.questions[1].explanation.fa
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PUBLISHED,
      node: 'grammar-001',
      where: 'explanations.de',
      message: 'is missing; this text is needed in de',
    },
    { file: PUBLISHED, node: 'grammar-001', where: 'examples[1].en', message: 'is missing; this text is needed in en' },
    {
      file: PUBLISHED,
      node: 'grammar-001',
      question: 'q2',
      where: 'questions[1].explanation.fa',
      message: 'is missing; this text is needed in fa',
    },
  ])
})
