import { MINIMUM_POOL_SIZE } from '../../content-model/index.ts'
import { QUESTIONS_PER_WORD } from '../vocabulary.ts'
import { type ContentCheck, problemIn } from './check.ts'

/**
 * A published node has a pool that an attempt can draw a fresh set from: at
 * least the minimum, and more than one attempt draws, so that a retry is not
 * the same questions again. A vocabulary test asks about a word once, so
 * there it is more words than the attempt. A draft may be smaller. An exam-part node has no pool: a reading part asks
 * a whole task in the format of its exam part (`practiceTaskFitsItsPart`
 * holds it to that format), and a writing or speaking part has a task for an
 * AI assistant (see assistant-graded-node-has-no-pool.ts).
 */
export const poolIsLargeEnough: ContentCheck = ({ nodes }) =>
  nodes.flatMap((checked) => {
    const { node } = checked
    if (node.status !== 'published' || node.kind === 'exam-part') return []

    if (node.kind === 'vocabulary') {
      const words = node.words?.length ?? 0
      const size = words * QUESTIONS_PER_WORD
      if (size < MINIMUM_POOL_SIZE) {
        return [
          problemIn(checked, {
            where: 'words',
            message: `pool too small: a published node needs at least ${MINIMUM_POOL_SIZE} questions, and the ${words} words of this one give ${size} (two for each word)`,
          }),
        ]
      }
      if (words > node.attemptSize) return []
      return [
        problemIn(checked, {
          where: 'attemptSize',
          message: `too few words for its attempt: an attempt asks about ${node.attemptSize} words and the node has ${words}, so every retry asks about the same ones; add words or lower attemptSize`,
        }),
      ]
    }

    const size = node.questions?.length ?? 0
    if (size < MINIMUM_POOL_SIZE) {
      return [
        problemIn(checked, {
          where: 'questions',
          message: `pool too small: a published node needs at least ${MINIMUM_POOL_SIZE} questions, this one has ${size}`,
        }),
      ]
    }
    if (size > node.attemptSize) return []
    return [
      problemIn(checked, {
        where: 'attemptSize',
        message: `pool too small for its attempt: an attempt draws ${node.attemptSize} questions and the pool has ${size}, so every retry asks the same ones; write more questions or lower attemptSize`,
      }),
    ]
  })
