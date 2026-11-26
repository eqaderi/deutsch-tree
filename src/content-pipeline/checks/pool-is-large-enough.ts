import { MINIMUM_POOL_SIZE } from '../../content-model/index.ts'
import { QUESTIONS_PER_WORD } from '../vocabulary.ts'
import { type ContentCheck, problemIn } from './check.ts'

/**
 * A published node has a pool that an attempt can draw a fresh set from. A
 * draft may be smaller. An exam-part node has no pool: a reading part asks
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
      if (size >= MINIMUM_POOL_SIZE) return []
      return [
        problemIn(checked, {
          where: 'words',
          message: `pool too small: a published node needs at least ${MINIMUM_POOL_SIZE} questions, and the ${words} words of this one give ${size} (two for each word)`,
        }),
      ]
    }

    const size = node.questions?.length ?? 0
    if (size >= MINIMUM_POOL_SIZE) return []
    return [
      problemIn(checked, {
        where: 'questions',
        message: `pool too small: a published node needs at least ${MINIMUM_POOL_SIZE} questions, this one has ${size}`,
      }),
    ]
  })
