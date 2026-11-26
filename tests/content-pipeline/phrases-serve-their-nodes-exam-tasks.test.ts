import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { changeNode, fixtureContentWith } from './fixture.ts'

/** The fixture's published phrases node. It serves exam-schreiben-1 and exam-sprechen-1. */
const PHRASES = 'nodes/phrases/phrases-greeting.yaml'

test('a phrase that serves an exam task its node does not name is rejected', async () => {
  const content = await fixtureContentWith({
    [PHRASES]: changeNode((node) => {
      node.phrases[0].examTasks = ['exam-sprechen-1', 'exam-sprechen-2']
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PHRASES,
      node: 'phrases-greeting',
      where: 'phrases[0].examTasks[1]',
      message:
        '"exam-sprechen-2" is not an exam task of this node. A phrase serves one or more of the node\'s own examTasks: exam-schreiben-1, exam-sprechen-1',
    },
  ])
  expect(bundle).toBeNull()
})

test('a published phrases node has a phrase for every exam task it names', async () => {
  const content = await fixtureContentWith({
    [PHRASES]: changeNode((node) => {
      for (const phrase of node.phrases) phrase.examTasks = ['exam-schreiben-1']
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PHRASES,
      node: 'phrases-greeting',
      where: 'examTasks[1]',
      message: 'no phrase of this node serves "exam-sprechen-1"; name it in a phrase or take it out here',
    },
  ])
})

test('a draft may name exam tasks that its phrases do not cover yet', async () => {
  const content = await fixtureContentWith({
    [PHRASES]: changeNode((node) => {
      node.status = 'coming-soon'
      for (const phrase of node.phrases) phrase.examTasks = ['exam-schreiben-1']
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([])
})
