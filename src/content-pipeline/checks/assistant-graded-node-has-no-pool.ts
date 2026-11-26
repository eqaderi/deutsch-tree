import { isAssistantGraded } from '../../content-model/scoring.ts'
import { type ContentCheck, type ContentProblem, problemIn } from './check.ts'

/**
 * A writing or speaking node holds no question pool and no review record.
 *
 * Such a node is not tested by questions: the learner does its task, an AI
 * assistant grades it with the prompt the app provides, and the learner types
 * the score in. The rules for pools (a minimum size, a blind review of the
 * answer key) therefore do not apply to it, and this check keeps such a node
 * from looking as if it had passed them: a pool on it would never be drawn
 * from, and a review record on it would be proof of a review that cannot
 * have happened.
 */
export const assistantGradedNodeHasNoPool: ContentCheck = ({ nodes }) => {
  const problems: ContentProblem[] = []
  for (const checked of nodes) {
    if (!isAssistantGraded(checked.node)) continue
    if (checked.node.questions !== undefined) {
      problems.push(
        problemIn(checked, {
          where: 'questions',
          message:
            'a writing or speaking node has no question pool: an AI assistant grades the task and the learner types the score in. Remove the questions',
        }),
      )
    }
    if (checked.node.review !== undefined) {
      problems.push(
        problemIn(checked, {
          where: 'review',
          message:
            'a review record is the proof of a blind review of a question pool, and a writing or speaking node has no pool. Remove the record',
        }),
      )
    }
  }
  return problems
}
