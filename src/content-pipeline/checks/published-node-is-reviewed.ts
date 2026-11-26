import { reviewProblem } from '../review.ts'
import { type ContentCheck, problemIn } from './check.ts'

/** A published node has a review record, and the record is of the pool it has now. A draft needs none. */
export const publishedNodeIsReviewed: ContentCheck = ({ nodes }) =>
  nodes.flatMap((checked) => {
    const message = reviewProblem(checked.node)
    return message ? [problemIn(checked, { where: 'review', message })] : []
  })
