import { isAssistantGraded } from '../../content-model/index.ts'
import { reviewProblem } from '../review.ts'
import { type ContentCheck, problemIn } from './check.ts'

/**
 * A published node has a review record, and the record is of the pool it has
 * now. A draft needs none. A writing or speaking node has no pool to review
 * blind (see assistant-graded-node-has-no-pool.ts), so it needs none either.
 */
export const publishedNodeIsReviewed: ContentCheck = ({ nodes }) =>
  nodes.flatMap((checked) => {
    if (isAssistantGraded(checked.node)) return []
    const message = reviewProblem(checked.node)
    return message ? [problemIn(checked, { where: 'review', message })] : []
  })
