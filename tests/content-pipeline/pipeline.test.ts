import { expect, test } from 'vitest'
import { compileContent, formatReport } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, fixtureContent, fixtureContentWith, PUBLISHED } from './fixture.ts'

test('valid content compiles and the report counts what was found', async () => {
  const { report, bundle } = await compileContent(fixtureContent)

  expect(report).toEqual({
    ok: true,
    errors: [],
    // The questions are the pools of the grammar nodes and the twelve items of the exam part's two practice tasks.
    nodes: { total: 8, published: 6, comingSoon: 2 },
    questions: 91,
  })
  expect(bundle).not.toBeNull()
})

test('a node file that breaks the content model is reported by file and place, and nothing is compiled', async () => {
  const content = await fixtureContentWith({
    'nodes/grammar/grammar-001.yaml': (text) => text.replace('kind: grammar', 'kind: grammer'),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.ok).toBe(false)
  expect(report.errors).toEqual([
    {
      file: 'nodes/grammar/grammar-001.yaml',
      node: 'grammar-001',
      where: 'kind',
      message: expect.stringContaining('"grammar"'),
    },
  ])
  expect(bundle).toBeNull()
})

test('the printed report names the node of every error and, inside a question, the question', async () => {
  const content = await fixtureContentWith({
    [PUBLISHED]: changeNode((node) => {
      node.questions[1].answer = 'wohnt'
    }),
    [COMING_SOON]: changeNode((node) => {
      node.prerequisites = ['grammar-099']
    }),
  })

  const { report } = await compileContent(content)

  expect(formatReport(report).split('\n')).toEqual([
    'ERROR node grammar-001, question q2 (nodes/grammar/grammar-001.yaml at questions[1].answer): no correct answer: "wohnt" is not one of the options',
    'ERROR node grammar-002 (nodes/grammar/grammar-002.yaml at prerequisites[0]): points nowhere: there is no node "grammar-099"',
    'Content has 2 errors. Nothing was compiled.',
  ])
})
