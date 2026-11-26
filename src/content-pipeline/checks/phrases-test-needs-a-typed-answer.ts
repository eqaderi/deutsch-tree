import type { NodeFile } from '../../content-model/index.ts'
import { passMark } from '../../learning-engine/index.ts'
import { type ContentCheck, problemIn } from './check.ts'

/** The question types in which the learner writes the German, and does not pick it from what is shown. */
const TYPED: ReadonlySet<NonNullable<NodeFile['questions']>[number]['type']> = new Set([
  'typed-answer',
  'typed-gap-fill',
])

/**
 * The test of a published phrases node proves recall, not only recognition.
 *
 * A learner who knows a phrase when they see it, and cannot say it, gets
 * every question right that is answered without typing and every typed one
 * wrong. So the pool holds fewer questions of the first sort than the pass
 * mark: whatever an attempt draws, it is not passed without typed answers.
 */
export const phrasesTestNeedsATypedAnswer: ContentCheck = ({ nodes }) =>
  nodes.flatMap((checked) => {
    const { kind, status, questions = [], attemptSize } = checked.node
    if (kind !== 'phrases' || status !== 'published') return []

    const notTyped = questions.filter((question) => !TYPED.has(question.type)).length
    const needed = passMark(attemptSize)
    if (notTyped < needed) return []
    return [
      problemIn(checked, {
        where: 'questions',
        message: `the test can be passed without producing a phrase: ${notTyped} questions are answered without typing, and an attempt of ${attemptSize} is passed with ${needed} right. Keep them under ${needed}, or make more of the questions typed ones`,
      }),
    ]
  })
