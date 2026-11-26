import { MINIMUM_POOL_SIZE } from '../../content-model/index.ts'
import { isAssistantGraded } from '../../content-model/scoring.ts'
import { type ContentCheck, problemIn } from './check.ts'

/**
 * A published node has a pool that an attempt can draw a fresh set from. A
 * draft may be smaller. A writing or speaking node has no pool at all (see
 * assistant-graded-node-has-no-pool.ts), so the rule does not apply to it.
 */
export const poolIsLargeEnough: ContentCheck = ({ nodes }) =>
  nodes.flatMap((checked) => {
    const size = checked.node.questions?.length ?? 0
    if (checked.node.status !== 'published' || isAssistantGraded(checked.node)) return []
    if (size >= MINIMUM_POOL_SIZE) return []
    return [
      problemIn(checked, {
        where: 'questions',
        message: `pool too small: a published node needs at least ${MINIMUM_POOL_SIZE} questions, this one has ${size}`,
      }),
    ]
  })
