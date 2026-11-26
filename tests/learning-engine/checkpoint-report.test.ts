import { expect, test } from 'vitest'
import { type Checkpoint, drawCheckpoint, scoreCheckpoint } from '../../src/learning-engine/index.ts'
import { multipleChoice } from './questions.ts'
import { seededRandom } from './random.ts'

/** A checkpoint of three nodes, two questions of each, asked in turn. Every right answer is "right". */
function checkpoint(): Checkpoint {
  const ask = (nodeId: string, id: string) => ({ nodeId, question: multipleChoice(id, 'right', ['wrong']) })
  return {
    nodeIds: ['articles', 'verbs', 'plural'],
    questions: [
      ask('verbs', 'q1'),
      ask('articles', 'q1'),
      ask('plural', 'q1'),
      ask('verbs', 'q2'),
      ask('articles', 'q2'),
      ask('plural', 'q2'),
    ],
  }
}

test('the report lists the nodes with a wrong answer, in curriculum order, with how many of their questions were wrong', () => {
  const result = scoreCheckpoint(checkpoint(), ['wrong', 'right', 'right', 'wrong', 'wrong', 'right'])

  expect(result.nodesToRevisit).toEqual([
    { nodeId: 'articles', asked: 2, wrong: 1 },
    { nodeId: 'verbs', asked: 2, wrong: 2 },
  ])
  expect(result).toMatchObject({ total: 6, correct: 3 })
})

test('a checkpoint with every answer right reports no node', () => {
  const result = scoreCheckpoint(checkpoint(), ['right', 'right', 'right', 'right', 'right', 'right'])

  expect(result).toMatchObject({ total: 6, correct: 6, nodesToRevisit: [] })
})

test('a question left without an answer counts as wrong for its node', () => {
  const result = scoreCheckpoint(checkpoint(), ['right', 'right', undefined, 'right', 'right'])

  expect(result.nodesToRevisit).toEqual([{ nodeId: 'plural', asked: 2, wrong: 2 }])
  expect(result).toMatchObject({ total: 6, correct: 4 })
})

test('the result goes through the checkpoint in order and says for each question its node, the answer and whether it was right', () => {
  const asked = checkpoint()

  const result = scoreCheckpoint(asked, ['wrong', 'right', 'right', 'right', 'right', 'right'])

  expect(result.questions).toHaveLength(6)
  expect(result.questions[0]).toEqual({
    nodeId: 'verbs',
    question: asked.questions[0]?.question,
    answer: 'wrong',
    correct: false,
  })
  expect(result.questions[1]).toEqual({
    nodeId: 'articles',
    question: asked.questions[1]?.question,
    answer: 'right',
    correct: true,
  })
})

test('questions go by place and node, so the same question identifier in two nodes is told apart', () => {
  // Both nodes have a "q1"; only the one of "verbs" is answered wrong.
  const result = scoreCheckpoint(checkpoint(), ['wrong', 'right', 'right', 'right', 'right', 'right'])

  expect(result.nodesToRevisit).toEqual([{ nodeId: 'verbs', asked: 2, wrong: 1 }])
})

test('a drawn checkpoint is reported like any other: wrong answers in two of forty nodes name those two nodes', () => {
  const nodes = Array.from({ length: 40 }, (_, index) => ({
    nodeId: `n${index + 1}`,
    questions: Array.from({ length: 15 }, (_, q) => multipleChoice(`q${q + 1}`, 'right', ['wrong'])),
  }))
  const drawn = drawCheckpoint(nodes, seededRandom(11))
  const [early, late] = [drawn.nodeIds[3], drawn.nodeIds[20]]

  const result = scoreCheckpoint(
    drawn,
    drawn.questions.map(({ nodeId }) => (nodeId === early || nodeId === late ? 'wrong' : 'right')),
  )

  expect(result.nodesToRevisit).toEqual([
    { nodeId: early, asked: 1, wrong: 1 },
    { nodeId: late, asked: 1, wrong: 1 },
  ])
  expect(result).toMatchObject({ total: 30, correct: 28 })
})
