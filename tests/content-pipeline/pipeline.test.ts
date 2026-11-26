import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from 'vitest'
import { parse } from 'yaml'
import { compileContent, formatReport } from '../../src/content-pipeline/index.ts'
import { COMING_SOON, changeNode, fixtureContent, fixtureContentWith, PUBLISHED } from './fixture.ts'

test('the index says which nodes have a test, so the tree can offer it without loading the node', async () => {
  const { bundle } = await compileContent(fixtureContent)

  const hasTest = Object.fromEntries((bundle?.index.nodes ?? []).map((node) => [node.id, node.hasTest]))
  expect(hasTest['grammar-001']).toBe(true)
  // Not written yet: nothing to test.
  expect(hasTest['grammar-002']).toBe(false)
  // Published, but without a pool: a score is typed in instead.
  expect(hasTest['exam-schreiben-1']).toBe(false)
  expect(hasTest['exam-sprechen-1']).toBe(false)
})

test('a draft pool inside a "coming soon" node is not a test', async () => {
  const published = await readFile(path.join(fixtureContent, PUBLISHED), 'utf8')
  const content = await fixtureContentWith({
    [COMING_SOON]: changeNode((node) => {
      node.questions = parse(published).questions
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([])
  expect(bundle?.index.nodes.find((node) => node.id === 'grammar-002')?.hasTest).toBe(false)
})

test('valid content compiles and the report counts what was found', async () => {
  const { report, bundle } = await compileContent(fixtureContent)

  expect(report).toEqual({
    ok: true,
    errors: [],
    nodes: { total: 9, published: 7, comingSoon: 2 },
    questions: 79,
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
