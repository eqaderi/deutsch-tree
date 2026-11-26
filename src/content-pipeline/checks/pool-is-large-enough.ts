import { MINIMUM_POOL_SIZE } from '../../content-model/index.ts'
import { type ContentCheck, problemIn } from './check.ts'

/** A published node has a pool that an attempt can draw a fresh set from. A draft may be smaller. */
export const poolIsLargeEnough: ContentCheck = ({ nodes }) =>
  nodes.flatMap((checked) => {
    const size = checked.node.questions?.length ?? 0
    if (checked.node.status !== 'published' || size >= MINIMUM_POOL_SIZE) return []
    return [
      problemIn(checked, {
        where: 'questions',
        message: `pool too small: a published node needs at least ${MINIMUM_POOL_SIZE} questions, this one has ${size}`,
      }),
    ]
  })
