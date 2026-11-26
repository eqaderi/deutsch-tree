import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { reviewFingerprint } from '../../src/content-pipeline/review.ts'
import { changeNode, fixtureContent, fixtureContentWith, SPEAKING, WRITING } from './fixture.ts'

/**
 * A writing or speaking node is graded by an AI assistant and has no question
 * pool. The rules for pools (at least 15 questions, a blind review) do not
 * apply to it, and it may not pretend to have passed them.
 */

const question = {
  id: 'q1',
  type: 'true-false',
  prompt: 'Ich schreibe eine E-Mail.',
  answer: true,
  explanation: { en: 'Fixture reason.', fa: 'دلیل آزمایشی.', de: 'Test-Grund.' },
}

test('published writing and speaking nodes pass with no question pool and no review record', async () => {
  const { report, bundle } = await compileContent(fixtureContent)

  expect(report.errors).toEqual([])
  const examParts = bundle?.index.nodes.filter((node) => node.kind === 'exam-part')
  expect(examParts?.map((node) => [node.id, node.status])).toEqual([
    ['exam-lesen-1', 'published'],
    ['exam-schreiben-1', 'published'],
    ['exam-sprechen-1', 'published'],
    ['exam-schreiben-3', 'coming-soon'],
  ])
})

test('a writing node may not hold a question pool', async () => {
  const content = await fixtureContentWith({
    [WRITING]: changeNode((node) => {
      node.questions = [question]
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: WRITING,
      node: 'exam-schreiben-1',
      where: 'questions',
      message:
        'a writing or speaking node has no question pool: an AI assistant grades the task and the learner types the score in. Remove the questions',
    },
  ])
  expect(bundle).toBeNull()
})

test('a speaking node may not carry a review record, since there is no pool that was reviewed', async () => {
  const content = await fixtureContentWith({
    [SPEAKING]: changeNode((node) => {
      node.review = { reviewer: 'Fixture reviewer', date: '2026-11-26', pool: reviewFingerprint({}) }
    }),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: SPEAKING,
      node: 'exam-sprechen-1',
      where: 'review',
      message:
        'a review record is the proof of a blind review of a question pool, and a writing or speaking node has no pool. Remove the record',
    },
  ])
  expect(bundle).toBeNull()
})

test('the same holds for a "coming soon" draft of such a node', async () => {
  const content = await fixtureContentWith({
    [WRITING]: changeNode((node) => {
      node.status = 'coming-soon'
      node.questions = [question]
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toMatchObject([{ node: 'exam-schreiben-1', where: 'questions' }])
})
