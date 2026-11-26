import { expect, test } from 'vitest'
import { compileContent } from '../../src/content-pipeline/index.ts'
import { changeReviewedNode, fixtureContentWith, type LooseNode } from './fixture.ts'

/**
 * The fixture's published phrases node: 6 questions answered by choosing
 * (q1 to q6) and 9 answered by typing (q7 to q15). An attempt draws 10 and is
 * passed with 9 right.
 */
const PHRASES = 'nodes/phrases/phrases-greeting.yaml'

/** Turns the first `count` typed questions into gap fills that are answered by choosing. */
function typedToChosen(node: LooseNode, count: number) {
  const typed = node.questions.filter((question: LooseNode) => question.type === 'typed-gap-fill').slice(0, count)
  for (const question of typed) {
    question.type = 'gap-fill'
    question.answer = question.answers[0]
    question.options = [question.answer, 'falsch']
    delete question.answers
  }
}

test('a phrases node whose test can be passed without typing an answer is rejected', async () => {
  const content = await fixtureContentWith({
    [PHRASES]: changeReviewedNode((node) => typedToChosen(node, 3)),
  })

  const { report, bundle } = await compileContent(content)

  expect(report.errors).toEqual([
    {
      file: PHRASES,
      node: 'phrases-greeting',
      where: 'questions',
      message:
        'the test can be passed without producing a phrase: 9 questions are answered without typing, and an attempt of 10 is passed with 9 right. Keep them under 9, or make more of the questions typed ones',
    },
  ])
  expect(bundle).toBeNull()
})

test('one question fewer answered by choosing, and no attempt can be passed without a typed answer', async () => {
  const content = await fixtureContentWith({
    [PHRASES]: changeReviewedNode((node) => typedToChosen(node, 2)),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([])
})

test('a draft of a phrases node is not yet held to it', async () => {
  const content = await fixtureContentWith({
    [PHRASES]: changeReviewedNode((node) => {
      node.status = 'coming-soon'
      typedToChosen(node, 3)
    }),
  })

  const { report } = await compileContent(content)

  expect(report.errors).toEqual([])
})
