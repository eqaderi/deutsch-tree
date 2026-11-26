import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, comingSoonNode, fixtureContentWith, PUBLISHED } from './fixture.ts'

test('a duplicated node identifier is rejected, and the report names both files', async () => {
  const content = await fixtureContentWith({
    'nodes/extra/grammar-002.yaml': () => comingSoonNode('grammar-002'),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: COMING_SOON,
      node: 'grammar-002',
      where: 'id',
      message: 'duplicated node id: "grammar-002" is also the id of nodes/extra/grammar-002.yaml',
    },
  ])
  expect(report.ok).toBe(false)
  expect(bundle).toBeNull()
})

test('a duplicated question identifier inside a node is rejected, and the report names the question', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.questions[1].id = 'q1'
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PUBLISHED,
      node: 'grammar-001',
      question: 'q1',
      where: 'questions[1].id',
      message: 'duplicated question id: "q1" is also the id of questions[0]',
    },
  ])
  expect(bundle).toBeNull()
})
